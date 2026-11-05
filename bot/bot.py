import os
import sys
import time
import json
import logging
import threading
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("EcosPOS_Bot")

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8890616601:AAEwhpSiD6VcP7Z6WYecl4kJpqvF6-knZS4")
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
PLATFORM_DB = os.getenv("PLATFORM_DB", "platform_db")

def get_platform_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=PLATFORM_DB
    )

def get_tenant_db_name(company_slug):
    try:
        with get_platform_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT db_name FROM companies WHERE slug = %s AND is_deleted = false", (company_slug,))
                row = cur.fetchone()
                if row:
                    return row[0]
    except Exception as e:
        logger.error(f"Error getting db_name for {company_slug}: {e}")
    return "tenant_test_market"

def get_tenant_conn(company_slug="test_market"):
    db_name = get_tenant_db_name(company_slug)
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=db_name
    )

def format_money(val):
    try:
        n = round(float(val or 0))
        return f"{n:,}".replace(",", " ") + " so'm"
    except Exception:
        return "0 so'm"

def send_message(chat_id, text, reply_markup=None):
    url = f"{TELEGRAM_API}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=15)
        return res.json()
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        return None

def edit_message(chat_id, message_id, text, reply_markup=None):
    url = f"{TELEGRAM_API}/editMessageText"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=15)
        return res.json()
    except Exception as e:
        logger.error(f"Failed to edit message: {e}")
        return None

def answer_callback_query(callback_query_id, text=None):
    url = f"{TELEGRAM_API}/answerCallbackQuery"
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        logger.error(f"Failed to answer callback query: {e}")

def get_user_state(chat_id):
    try:
        with get_platform_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT chat_id, selected_company_slug, notify_sales, notify_daily FROM telegram_subscribers WHERE chat_id = %s",
                    (chat_id,)
                )
                row = cur.fetchone()
                if row:
                    return {
                        "is_subscribed": True,
                        "company_slug": row.get("selected_company_slug") or "test_market",
                        "notify_sales": row.get("notify_sales", True),
                        "notify_daily": row.get("notify_daily", True),
                    }
    except Exception as e:
        logger.error(f"Error fetching subscriber state: {e}")
    return {
        "is_subscribed": False,
        "company_slug": "test_market",
        "notify_sales": True,
        "notify_daily": True,
    }

def get_active_companies():
    try:
        with get_platform_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, name, slug FROM companies WHERE is_deleted = false AND status = 'ACTIVE' ORDER BY id ASC")
                return cur.fetchall()
    except Exception as e:
        logger.error(f"Error getting companies: {e}")
        return []

def set_user_company(chat_id, company_slug):
    try:
        with get_platform_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO telegram_subscribers (chat_id, selected_company_slug, notify_sales, notify_daily)
                    VALUES (%s, %s, true, true)
                    ON CONFLICT (chat_id) DO UPDATE SET selected_company_slug = EXCLUDED.selected_company_slug
                """, (chat_id, company_slug))
                conn.commit()
                return True
    except Exception as e:
        logger.error(f"Error updating user company: {e}")
        return False

def toggle_user_notification(chat_id, field):
    try:
        with get_platform_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    UPDATE telegram_subscribers 
                    SET {field} = NOT COALESCE({field}, true)
                    WHERE chat_id = %s
                    RETURNING {field}
                """, (chat_id,))
                row = cur.fetchone()
                conn.commit()
                if row is not None:
                    return row[0]
    except Exception as e:
        logger.error(f"Error toggling {field}: {e}")
    return None

def get_main_keyboard():
    return {
        "keyboard": [
            [{"text": "📊 Bugungi savdo"}, {"text": "📈 Haftalik hisobot"}],
            [{"text": "📅 Kechagi savdo"}, {"text": "💼 Kassa & Kassirlar"}],
            [{"text": "👥 Qarzdorlar"}, {"text": "📦 Kam qolgan tovarlar"}],
            [{"text": "🔍 Tovar qidirish"}, {"text": "🛒 So'nggi cheklar"}],
            [{"text": "🏢 Do'konni tanlash"}, {"text": "⚙️ Sozlamalar"}]
        ],
        "resize_keyboard": True
    }

# --- STATISTIKA FUNKSIYALARI ---

def get_today_stats(company_slug="test_market"):
    now_date = datetime.now().strftime("%d.%m.%Y %H:%M")
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        COALESCE(SUM(total_amount), 0) as total_rev,
                        COUNT(*) as count,
                        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_rev,
                        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0) as card_rev,
                        COALESCE(SUM(CASE WHEN payment_method = 'MIXED' THEN total_amount ELSE 0 END), 0) as mixed_rev
                    FROM sales 
                    WHERE is_deleted = false 
                      AND DATE(created_at) = CURRENT_DATE
                """)
                row = cur.fetchone()
                
                # Nasiya / Qarz bo'yicha
                cur.execute("""
                    SELECT COALESCE(SUM(amount), 0) as debt_total
                    FROM customer_debt_transactions
                    WHERE type = 'CREDIT_SALE' AND DATE(created_at) = CURRENT_DATE
                """)
                debt_row = cur.fetchone()
                debt_total = debt_row['debt_total'] if debt_row else 0

                # Sotilgan tovarlar miqdori
                cur.execute("""
                    SELECT COALESCE(SUM(si.quantity), 0) as items_sold
                    FROM sale_items si
                    JOIN sales s ON si.sale_id = s.id
                    WHERE s.is_deleted = false AND DATE(s.created_at) = CURRENT_DATE
                """)
                items_row = cur.fetchone()
                items_sold = items_row['items_sold'] if items_row else 0

                total_rev = row['total_rev']
                count = row['count']
                cash_rev = row['cash_rev']
                card_rev = row['card_rev']
                mixed_rev = row['mixed_rev']
                avg = (total_rev / count) if count > 0 else 0

                text = (
                    f"📊 <b>Bugungi savdo hisoboti</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"🕒 <i>Vaqt: {now_date}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 <b>Jami tushum:</b> {format_money(total_rev)}\n"
                    f"🧾 <b>Cheklar soni:</b> {count} ta\n"
                    f"📦 <b>Sotilgan tovarlar:</b> {round(float(items_sold), 1)} dona/kg\n"
                    f"💵 <b>Naqd pul:</b> {format_money(cash_rev)}\n"
                    f"💳 <b>Plastik karta:</b> {format_money(card_rev)}\n"
                )
                if mixed_rev > 0:
                    text += f"🔀 <b>Aralash to'lov:</b> {format_money(mixed_rev)}\n"
                if debt_total > 0:
                    text += f"🤝 <b>Nasiya (Qarz):</b> {format_money(debt_total)}\n"
                text += (
                    f"🎯 <b>O'rtacha chek:</b> {format_money(avg)}\n"
                    f"━━━━━━━━━━━━━━━━━━━"
                )
                return text
    except Exception as e:
        logger.error(f"Error fetching today stats: {e}")
        return f"Xatolik yuz berdi: {e}"

def get_yesterday_stats(company_slug="test_market"):
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%d.%m.%Y")
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        COALESCE(SUM(total_amount), 0) as total_rev,
                        COUNT(*) as count,
                        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_rev,
                        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0) as card_rev
                    FROM sales 
                    WHERE is_deleted = false 
                      AND DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
                """)
                row = cur.fetchone()
                total_rev = row['total_rev']
                count = row['count']
                cash_rev = row['cash_rev']
                card_rev = row['card_rev']
                avg = (total_rev / count) if count > 0 else 0

                return (
                    f"📅 <b>Kechagi kun hisoboti ({yesterday})</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 <b>Jami tushum:</b> {format_money(total_rev)}\n"
                    f"🧾 <b>Cheklar soni:</b> {count} ta\n"
                    f"💵 <b>Naqd pul:</b> {format_money(cash_rev)}\n"
                    f"💳 <b>Karta:</b> {format_money(card_rev)}\n"
                    f"🎯 <b>O'rtacha chek:</b> {format_money(avg)}\n"
                    f"━━━━━━━━━━━━━━━━━━━"
                )
    except Exception as e:
        logger.error(f"Error fetching yesterday stats: {e}")
        return f"Xatolik: {e}"

def get_weekly_stats(company_slug="test_market"):
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        COALESCE(SUM(total_amount), 0) as total_rev,
                        COUNT(*) as count
                    FROM sales 
                    WHERE is_deleted = false 
                      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
                """)
                summary = cur.fetchone()

                # Kunlik taqsimot
                cur.execute("""
                    SELECT 
                        TO_CHAR(created_at, 'DD.MM') as day_str,
                        COALESCE(SUM(total_amount), 0) as rev,
                        COUNT(*) as cnt
                    FROM sales 
                    WHERE is_deleted = false 
                      AND created_at >= CURRENT_DATE - INTERVAL '6 days'
                    GROUP BY TO_CHAR(created_at, 'DD.MM'), DATE(created_at)
                    ORDER BY DATE(created_at) ASC
                """)
                daily_rows = cur.fetchall()

                # Top-3 bestseller tovarlar
                cur.execute("""
                    SELECT p.name, COALESCE(SUM(si.quantity), 0) as qty, p.unit
                    FROM sale_items si
                    JOIN sales s ON si.sale_id = s.id
                    JOIN products p ON si.product_id = p.id
                    WHERE s.is_deleted = false AND s.created_at >= CURRENT_DATE - INTERVAL '7 days'
                    GROUP BY p.name, p.unit
                    ORDER BY qty DESC
                    LIMIT 3
                """)
                top_products = cur.fetchall()

                text = (
                    f"📈 <b>Oxirgi 7 kunlik tahlil</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 <b>7 kunlik tushum:</b> {format_money(summary['total_rev'])}\n"
                    f"🧾 <b>Jami cheklar:</b> {summary['count']} ta\n\n"
                    f"📅 <b>Kunlik dinamika:</b>\n"
                )
                if daily_rows:
                    for d in daily_rows:
                        text += f" • {d['day_str']}: <b>{format_money(d['rev'])}</b> ({d['cnt']} ta chek)\n"
                else:
                    text += " • Oxirgi 7 kunda savdolar qayd etilmadi\n"

                if top_products:
                    text += f"\n🏆 <b>Eng xaridorgir tovarlar:</b>\n"
                    for idx, tp in enumerate(top_products, 1):
                        text += f" {idx}. {tp['name']} — <b>{round(float(tp['qty']), 1)} {tp['unit']}</b>\n"

                text += "━━━━━━━━━━━━━━━━━━━"
                return text
    except Exception as e:
        logger.error(f"Error fetching weekly stats: {e}")
        return f"Xatolik: {e}"

def get_cashiers_stats(company_slug="test_market"):
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Ochiq smenalar
                cur.execute("""
                    SELECT cs.id, cs.opening_cash, cs.opened_at, u.full_name as cashier_name, b.name as branch_name
                    FROM cash_shifts cs
                    JOIN users u ON cs.cashier_id = u.id
                    LEFT JOIN branches b ON cs.branch_id = b.id
                    WHERE cs.status = 'OPEN' AND cs.is_deleted = false
                """)
                open_shifts = cur.fetchall()

                # Kassirlar bo'yicha bugungi savdo
                cur.execute("""
                    SELECT 
                        COALESCE(u.full_name, 'Noma\'lum') as cashier_name,
                        COUNT(s.id) as sales_count,
                        COALESCE(SUM(s.total_amount), 0) as total_rev
                    FROM sales s
                    LEFT JOIN users u ON s.cashier_id = u.id
                    WHERE s.is_deleted = false AND DATE(s.created_at) = CURRENT_DATE
                    GROUP BY u.full_name
                    ORDER BY total_rev DESC
                """)
                cashier_sales = cur.fetchall()

                text = (
                    f"💼 <b>Kassa va Kassirlar faolligi</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n\n"
                    f"🟢 <b>Faol kassa smenalari:</b>\n"
                )
                if open_shifts:
                    for s in open_shifts:
                        opened_time = s['opened_at'].strftime("%H:%M (%d.%m)")
                        text += (
                            f"👤 <b>{s['cashier_name']}</b> ({s['branch_name'] or 'Bosh filial'})\n"
                            f"   Boshlang'ich qoldiq: {format_money(s['opening_cash'])}\n"
                            f"   Ochilgan: {opened_time}\n"
                        )
                else:
                    text += "<i>Hozirda ochiq smenalar yo'q. Barcha kassalar yopiq.</i>\n"

                text += f"\n🏆 <b>Bugungi kassirlar tushumi:</b>\n"
                if cashier_sales:
                    for cs in cashier_sales:
                        text += f" • <b>{cs['cashier_name']}:</b> {format_money(cs['total_rev'])} ({cs['sales_count']} ta chek)\n"
                else:
                    text += "<i>Bugun hali savdolar amalga oshirilmadi.</i>\n"

                text += "━━━━━━━━━━━━━━━━━━━"
                return text
    except Exception as e:
        logger.error(f"Error fetching cashier stats: {e}")
        return f"Xatolik: {e}"

def get_debtors(company_slug="test_market"):
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        c.id, c.full_name, c.phone,
                        COALESCE(SUM(CASE WHEN t.type = 'CREDIT_SALE' THEN t.amount ELSE -t.amount END), 0) as balance
                    FROM customers c
                    JOIN customer_debt_transactions t ON c.id = t.customer_id
                    WHERE c.is_deleted = false
                    GROUP BY c.id, c.full_name, c.phone
                    HAVING COALESCE(SUM(CASE WHEN t.type = 'CREDIT_SALE' THEN t.amount ELSE -t.amount END), 0) > 0
                    ORDER BY balance DESC
                    LIMIT 10
                """)
                debtors = cur.fetchall()

                if not debtors:
                    return "👥 <b>Qarzdorlar ro'yxati:</b>\n\nTabriklaymiz! Hozirda faol qarzdorlar mavjud emas. Barcha qarzlar to'langan."

                total_debt = sum(d['balance'] for d in debtors)
                text = (
                    f"👥 <b>Qarzdorlar ro'yxati</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"💰 <b>Jami qarz miqdori:</b> {format_money(total_debt)}\n"
                    f"━━━━━━━━━━━━━━━━━━━\n\n"
                )
                for i, d in enumerate(debtors, 1):
                    phone = f" 📞 <code>{d['phone']}</code>" if d['phone'] else ""
                    text += f"{i}. <b>{d['full_name']}</b>{phone}\n    Qarz: <code>{format_money(d['balance'])}</code>\n\n"
                text += "━━━━━━━━━━━━━━━━━━━"
                return text
    except Exception as e:
        logger.error(f"Error fetching debtors: {e}")
        return f"Xatolik: {e}"

def get_recent_sales(company_slug="test_market"):
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT s.id, s.total_amount, s.payment_method, s.created_at, u.full_name as cashier
                    FROM sales s
                    LEFT JOIN users u ON s.cashier_id = u.id
                    WHERE s.is_deleted = false
                    ORDER BY s.id DESC
                    LIMIT 6
                """)
                sales = cur.fetchall()

                if not sales:
                    return "🛒 <b>So'nggi savdolar:</b>\n\nHozircha do'konda savdolar mavjud emas."

                text = (
                    f"🛒 <b>So'nggi savdolar (Cheklar):</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n\n"
                )
                for s in sales:
                    t_str = s['created_at'].strftime("%H:%M:%S (%d.%m)")
                    method = "💵 Naqd" if s['payment_method'] == 'CASH' else "💳 Karta" if s['payment_method'] == 'CARD' else "🔀 Aralash"
                    cashier_name = s['cashier'] or "Kassir"
                    text += (
                        f"🧾 <b>Chek #{s['id']}</b> — <b>{format_money(s['total_amount'])}</b>\n"
                        f"   To'lov: {method} • {t_str}\n"
                        f"   Kassir: {cashier_name}\n"
                        f"───────────────────\n"
                    )
                return text
    except Exception as e:
        logger.error(f"Error fetching recent sales: {e}")
        return f"Xatolik: {e}"

def get_low_stock(company_slug="test_market"):
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT p.name, p.unit, sl.quantity, p.min_stock_level, p.sale_price
                    FROM stock_levels sl
                    JOIN products p ON sl.product_id = p.id
                    WHERE p.is_deleted = false 
                      AND sl.quantity <= COALESCE(p.min_stock_level, 5)
                    ORDER BY sl.quantity ASC
                    LIMIT 10
                """)
                items = cur.fetchall()

                if not items:
                    return "📦 <b>Ombor qoldiqlari holati:</b>\n\nBarcha tovarlar yetarli miqdorda mavjud. Kam qolgan tovarlar aniqlanmadi."

                text = (
                    f"⚠️ <b>Kam qolgan tovarlar (Top-10):</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n\n"
                )
                for item in items:
                    qty = round(float(item['quantity']), 2)
                    min_q = round(float(item['min_stock_level'] or 5), 1)
                    text += (
                        f"• <b>{item['name']}</b>\n"
                        f"  Qoldiq: <code>{qty} {item['unit']}</code> (Minimal: {min_q} {item['unit']})\n"
                        f"  Narxi: {format_money(item['sale_price'])}\n\n"
                    )
                text += "━━━━━━━━━━━━━━━━━━━"
                return text
    except Exception as e:
        logger.error(f"Error fetching low stock: {e}")
        return f"Xatolik: {e}"

def search_products(query, company_slug="test_market"):
    if not query or len(query.strip()) < 2:
        return "Iltimos, tovar nomidan yoki shtrix-kodidan kamida 2 ta belgi kiriting."

    q = f"%{query.strip()}%"
    try:
        with get_tenant_conn(company_slug) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        p.id, p.name, p.barcode, p.unit, p.sale_price, p.cost_price,
                        COALESCE(SUM(sl.quantity), 0) as total_qty,
                        c.name as category_name
                    FROM products p
                    LEFT JOIN stock_levels sl ON p.id = sl.product_id
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE p.is_deleted = false 
                      AND (p.name ILIKE %s OR p.barcode ILIKE %s)
                    GROUP BY p.id, p.name, p.barcode, p.unit, p.sale_price, p.cost_price, c.name
                    ORDER BY p.name ASC
                    LIMIT 8
                """, (q, q))
                products = cur.fetchall()

                if not products:
                    return f"🔍 <b>\"{query}\"</b> bo'yicha hech qanday tovar topilmadi."

                text = (
                    f"🔍 <b>Qidiruv natijalari (\"{query}\"):</b>\n"
                    f"🏪 <i>Do'kon: {company_slug}</i>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n\n"
                )
                for p in products:
                    barcode_str = f"🔖 Kod: <code>{p['barcode']}</code>\n" if p['barcode'] else ""
                    cat_str = f"📂 Bolim: {p['category_name']}\n" if p['category_name'] else ""
                    qty = round(float(p['total_qty']), 2)
                    text += (
                        f"📦 <b>{p['name']}</b>\n"
                        f"{cat_str}"
                        f"{barcode_str}"
                        f"💰 Sotish narxi: <b>{format_money(p['sale_price'])}</b>\n"
                        f"📊 Ombor qoldig'i: <code>{qty} {p['unit']}</code>\n"
                        f"───────────────────\n"
                    )
                return text
    except Exception as e:
        logger.error(f"Search product error: {e}")
        return f"Xatolik: {e}"

def get_store_selector_keyboard():
    companies = get_active_companies()
    buttons = []
    for c in companies:
        buttons.append([{
            "text": f"🏪 {c['name']} ({c['slug']})",
            "callback_data": f"select_company:{c['slug']}"
        }])
    return {"inline_keyboard": buttons}

def get_stats_inline_keyboard():
    return {
        "inline_keyboard": [
            [
                {"text": "🔄 Yangilash", "callback_data": "refresh_today"},
                {"text": "🛒 Oxirgi savdolar", "callback_data": "view_recent"}
            ],
            [
                {"text": "📅 Kechagi kun", "callback_data": "view_yesterday"},
                {"text": "📈 Haftalik", "callback_data": "view_week"}
            ]
        ]
    }

def get_settings_keyboard(chat_id):
    state = get_user_state(chat_id)
    sales_icon = "✅" if state["notify_sales"] else "❌"
    daily_icon = "✅" if state["notify_daily"] else "❌"
    return {
        "inline_keyboard": [
            [
                {"text": f"{sales_icon} Har bir savdo xabari", "callback_data": "toggle:notify_sales"}
            ],
            [
                {"text": f"{daily_icon} Kunlik kechki hisobot (21:00)", "callback_data": "toggle:notify_daily"}
            ],
            [
                {"text": "📱 Mobil ilovani yuklab olish (APK)", "url": "https://savdo.ecos.uz/downloads/ecospos.apk"}
            ],
            [
                {"text": "🌐 Veb-panelga kirish", "url": "https://savdo.ecos.uz/login"}
            ]
        ]
    }

# --- REAL-TIME SAVDOLAR MONITORINGI ---
def sales_broadcaster():
    logger.info("Sales broadcaster running...")
    last_ids = {}

    while True:
        try:
            time.sleep(4)
            companies = get_active_companies()
            for c in companies:
                c_slug = c['slug']
                if c_slug not in last_ids:
                    try:
                        with get_tenant_conn(c_slug) as conn:
                            with conn.cursor() as cur:
                                cur.execute("SELECT COALESCE(MAX(id), 0) FROM sales")
                                row = cur.fetchone()
                                last_ids[c_slug] = row[0] if row else 0
                    except Exception:
                        last_ids[c_slug] = 0
                        continue

                try:
                    with get_tenant_conn(c_slug) as conn:
                        with conn.cursor(cursor_factory=RealDictCursor) as cur:
                            cur.execute("""
                                SELECT s.id, s.total_amount, s.payment_method, s.created_at, u.full_name as cashier
                                FROM sales s
                                LEFT JOIN users u ON s.cashier_id = u.id
                                WHERE s.id > %s AND s.is_deleted = false
                                ORDER BY s.id ASC
                            """, (last_ids[c_slug],))
                            new_sales = cur.fetchall()

                            for s in new_sales:
                                last_ids[c_slug] = s['id']
                                t_str = s['created_at'].strftime("%H:%M:%S")
                                method = "💵 Naqd" if s['payment_method'] == 'CASH' else "💳 Karta" if s['payment_method'] == 'CARD' else "🔀 Aralash"
                                cashier_name = s['cashier'] or "Kassir"
                                msg = (
                                    f"⚡️ <b>Yangi savdo amalga oshirildi!</b>\n"
                                    f"🏪 <i>Do'kon: {c['name']}</i>\n"
                                    f"━━━━━━━━━━━━━━━━━━━\n"
                                    f"🧾 <b>Chek:</b> #{s['id']}\n"
                                    f"💰 <b>Summa:</b> {format_money(s['total_amount'])}\n"
                                    f"💳 <b>To'lov turi:</b> {method}\n"
                                    f"👤 <b>Kassir:</b> {cashier_name}\n"
                                    f"🕒 <b>Vaqt:</b> {t_str}\n"
                                    f"━━━━━━━━━━━━━━━━━━━"
                                )

                                # Obunachilarga jo'natish
                                with get_platform_conn() as pconn:
                                    with pconn.cursor(cursor_factory=RealDictCursor) as pcur:
                                        pcur.execute("""
                                            SELECT chat_id FROM telegram_subscribers 
                                            WHERE (selected_company_slug = %s OR selected_company_slug IS NULL)
                                              AND notify_sales = true
                                        """, (c_slug,))
                                        for row in pcur.fetchall():
                                            send_message(row['chat_id'], msg)
                except Exception as e:
                    logger.debug(f"Broadcast error for {c_slug}: {e}")
        except Exception as e:
            logger.error(f"Broadcaster main error: {e}")
            time.sleep(5)

# --- KUNLIK KECHKI AVTOMATIK HISOBOT REJALASHTIRUVCHI (21:00) ---
def daily_report_scheduler():
    logger.info("Daily report scheduler started...")
    last_sent_date = None

    while True:
        try:
            time.sleep(30)
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            # Har kuni 21:00 da yuborish
            if now.hour == 21 and now.minute >= 0 and last_sent_date != today_str:
                logger.info("Sending daily evening reports to subscribers...")
                last_sent_date = today_str

                companies = get_active_companies()
                for c in companies:
                    c_slug = c['slug']
                    stats_text = (
                        f"🌙 <b>Kunlik yakuniy hisobot ({now.strftime('%d.%m.%Y')})</b>\n\n" +
                        get_today_stats(c_slug)
                    )

                    with get_platform_conn() as pconn:
                        with pconn.cursor(cursor_factory=RealDictCursor) as pcur:
                            pcur.execute("""
                                SELECT chat_id FROM telegram_subscribers 
                                WHERE (selected_company_slug = %s OR selected_company_slug IS NULL)
                                  AND notify_daily = true
                            """, (c_slug,))
                            for row in pcur.fetchall():
                                send_message(row['chat_id'], stats_text)
        except Exception as e:
            logger.error(f"Daily scheduler error: {e}")
            time.sleep(60)

# --- BOT UPDATE QABUL QILISH VA ISHLASH ---
def handle_update(update):
    # 1. Inline tugma bosilishi (Callback Query)
    if "callback_query" in update:
        cq = update["callback_query"]
        cq_id = cq["id"]
        chat_id = cq["message"]["chat"]["id"]
        msg_id = cq["message"]["message_id"]
        data = cq.get("data", "")
        state = get_user_state(chat_id)
        comp_slug = state["company_slug"]

        if data == "refresh_today":
            text = get_today_stats(comp_slug)
            edit_message(chat_id, msg_id, text, reply_markup=get_stats_inline_keyboard())
            answer_callback_query(cq_id, "Ma'lumotlar yangilandi!")

        elif data == "view_recent":
            text = get_recent_sales(comp_slug)
            edit_message(chat_id, msg_id, text, reply_markup=get_stats_inline_keyboard())
            answer_callback_query(cq_id)

        elif data == "view_yesterday":
            text = get_yesterday_stats(comp_slug)
            edit_message(chat_id, msg_id, text, reply_markup=get_stats_inline_keyboard())
            answer_callback_query(cq_id)

        elif data == "view_week":
            text = get_weekly_stats(comp_slug)
            edit_message(chat_id, msg_id, text, reply_markup=get_stats_inline_keyboard())
            answer_callback_query(cq_id)

        elif data.startswith("select_company:"):
            new_slug = data.split("select_company:")[1]
            set_user_company(chat_id, new_slug)
            answer_callback_query(cq_id, f"Do'kon {new_slug} tanlandi!")
            edit_message(
                chat_id,
                msg_id,
                f"✅ <b>Faol do'kon muvaffaqiyatli almashtirildi:</b> <code>{new_slug}</code>\n\n"
                f"Endi barcha hisobotlar va ogohlantirishlar shu do'konga tegishli bo'ladi.",
                reply_markup=get_stats_inline_keyboard()
            )

        elif data.startswith("toggle:"):
            field = data.split("toggle:")[1]
            res = toggle_user_notification(chat_id, field)
            status_text = "yoqildi" if res else "o'chirildi"
            answer_callback_query(cq_id, f"Sozlama {status_text}!")
            edit_message(
                chat_id,
                msg_id,
                "⚙️ <b>Bildirishnoma va Integratsiya Sozlamalari:</b>\n\nKerakli parametrni o'zgartirish uchun tugmani bosing:",
                reply_markup=get_settings_keyboard(chat_id)
            )

        return

    # 2. Oddiy xabarlar (Message)
    msg = update.get("message")
    if not msg:
        return

    chat_id = msg.get("chat", {}).get("id")
    text = (msg.get("text") or "").strip()
    from_user = msg.get("from", {})
    username = from_user.get("username", "")
    first_name = from_user.get("first_name", "")

    if not chat_id:
        return

    state = get_user_state(chat_id)
    comp_slug = state["company_slug"]
    kb = get_main_keyboard()

    if text in ["/start", "start", "/menu", "Menyu"]:
        welcome = (
            f"👋 Assalomu alaykum, <b>{first_name}</b>!\n\n"
            f"🏪 <b>EcosPOS Aqlli Savdo Tizimi Boti</b>ga xush kelibsiz.\n"
            f"Faol do'koningiz: <code>{comp_slug}</code>\n\n"
            f"Bu bot orqali savdolarni onlayn kuzatish, tovarlarni tezkor qidirish, "
            f"qarzlar va kassa holatini monitoring qilish imkoniyatiga egasiz.\n\n"
            f"Quyidagi menyudan kerakli bo'limni tanlang 👇"
        )
        send_message(chat_id, welcome, reply_markup=kb)

    elif text == "📊 Bugungi savdo":
        send_message(chat_id, get_today_stats(comp_slug), reply_markup=get_stats_inline_keyboard())

    elif text == "📈 Haftalik hisobot":
        send_message(chat_id, get_weekly_stats(comp_slug), reply_markup=get_stats_inline_keyboard())

    elif text == "📅 Kechagi savdo":
        send_message(chat_id, get_yesterday_stats(comp_slug), reply_markup=get_stats_inline_keyboard())

    elif text == "💼 Kassa & Kassirlar":
        send_message(chat_id, get_cashiers_stats(comp_slug), reply_markup=kb)

    elif text == "👥 Qarzdorlar":
        send_message(chat_id, get_debtors(comp_slug), reply_markup=kb)

    elif text == "📦 Kam qolgan tovarlar":
        send_message(chat_id, get_low_stock(comp_slug), reply_markup=kb)

    elif text == "🛒 So'nggi cheklar":
        send_message(chat_id, get_recent_sales(comp_slug), reply_markup=kb)

    elif text == "🏢 Do'konni tanlash":
        send_message(
            chat_id,
            "🏢 <b>Qaysi do'kon hisobotlarini ko'rmoqchisiz?</b>\n\nKerakli do'konni tanlang:",
            reply_markup=get_store_selector_keyboard()
        )

    elif text == "⚙️ Sozlamalar":
        send_message(
            chat_id,
            "⚙️ <b>Bildirishnoma va Integratsiya Sozlamalari:</b>\n\n"
            "O'zingizga qulay tarzda avtomatik xabarlarni sozlang:",
            reply_markup=get_settings_keyboard(chat_id)
        )

    elif text == "🔍 Tovar qidirish":
        send_message(
            chat_id,
            "🔍 <b>Tovar qidirish:</b>\n\n"
            "Izlamoqchi bo'lgan tovaringizning <b>nomi</b> yoki <b>shtrix-kodini</b> shu yerga yozib yuboring.\n"
            "Misol: <code>pepsi</code>, <code>non</code>, yoki <code>47800...</code>",
            reply_markup=kb
        )

    elif text.startswith("/search") or text.startswith("/tovar"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1:
            send_message(chat_id, search_products(parts[1], comp_slug), reply_markup=kb)
        else:
            send_message(chat_id, "Iltimos, tovar nomini kiriting. Misol: <code>/search sut</code>", reply_markup=kb)

    else:
        # Foydalanuvchi tovar nomini yoki shtrix-kodni to'g'ridan-to'g'ri yozgan bo'lishi mumkin!
        search_res = search_products(text, comp_slug)
        if "hech qanday tovar topilmadi" not in search_res and "kamida 2 ta belgi" not in search_res:
            send_message(chat_id, search_res, reply_markup=kb)
        else:
            send_message(
                chat_id,
                f"Buyruq tushunarsiz yoki tovar topilmadi.\n\n"
                f"Quyidagi menyu tugmalaridan foydalaning yoki tovar nomini aniqroq kiriting:",
                reply_markup=kb
            )

def main():
    logger.info("Starting EcosPOS Telegram Bot v2...")

    # Real-time savdo monitorini ishga tushirish
    t1 = threading.Thread(target=sales_broadcaster, daemon=True)
    t1.start()

    # Kunlik kechki hisobot rejalashtiruvchini ishga tushirish
    t2 = threading.Thread(target=daily_report_scheduler, daemon=True)
    t2.start()

    offset = 0
    while True:
        try:
            url = f"{TELEGRAM_API}/getUpdates"
            params = {"offset": offset, "timeout": 25}
            res = requests.get(url, params=params, timeout=30)
            data = res.json()

            if data.get("ok"):
                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    handle_update(update)
            else:
                logger.error(f"Telegram getUpdates returned error: {data}")
                time.sleep(2)
        except Exception as e:
            logger.error(f"Telegram polling error: {e}")
            time.sleep(3)

if __name__ == "__main__":
    main()
