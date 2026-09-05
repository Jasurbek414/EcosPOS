package uz.savdo.platform.dto;

import lombok.Data;

/** PATCH /api/v1/platform/companies/{id}/plan so'rovi. planId null bo'lsa — rejani olib tashlaydi. */
@Data
public class AssignPlanRequest {
    private Long planId;
}
