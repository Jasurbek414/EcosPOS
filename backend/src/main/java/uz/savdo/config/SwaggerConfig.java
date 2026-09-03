package uz.savdo.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger/OpenAPI konfiguratsiyasi.
 * http://localhost:8080/swagger-ui.html sahifasida API dokumentatsiyasi ko'rinadi.
 */
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Savdo POS API")
                        .description("Do'kon/supermarketlar uchun ko'p-tenantli POS tizimi")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Savdo Team")
                                .email("admin@savdo.uz")
                        )
                )
                .addSecurityItem(new SecurityRequirement().addList("Bearer Token"))
                .components(new Components()
                        .addSecuritySchemes("Bearer Token",
                                new SecurityScheme()
                                        .name("Authorization")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT tokenni kiriting (Bearer prefiksisiz)")
                        )
                );
    }
}
