package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Product;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByIsDeletedFalseOrderByIdAsc();

    Optional<Product> findByIdAndIsDeletedFalse(Long id);

    Optional<Product> findByBarcodeAndIsDeletedFalse(String barcode);

    // MUHIM: ":search"/":barcode" ni to'g'ridan-to'g'ri (cast qilmasdan) "is null" va
    // lower(...)/tenglik solishtiruvida BIRGA ishlatish PostgreSQL JDBC drayveri parametr
    // turini ANIQLAY OLMASLIGIGA sabab bo'ladi - null qiymat "bytea" deb noto'g'ri
    // taxmin qilinib, "function lower(bytea) does not exist" xatosi bilan yiqiladi (jonli
    // sinovda topilgan). "cast(:param as string)" bilan turni ANIQ ko'rsatish bu muammoni
    // hal qiladi.
    @Query("select p from Product p where p.isDeleted = false " +
            "and (:categoryId is null or p.categoryId = :categoryId) " +
            "and (cast(:search as string) is null or lower(p.name) like lower(concat('%', cast(:search as string), '%'))) " +
            "and (cast(:barcode as string) is null or p.barcode = cast(:barcode as string)) " +
            "order by p.id asc")
    List<Product> search(@Param("categoryId") Long categoryId,
                          @Param("search") String search,
                          @Param("barcode") String barcode);
}
