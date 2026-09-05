package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** PATCH /api/v1/platform/companies/{id}/branches-feature so'rovi. */
@Data
public class ToggleBranchesFeatureRequest {
    @NotNull(message = "enabled kiritilishi shart")
    private Boolean enabled;
}
