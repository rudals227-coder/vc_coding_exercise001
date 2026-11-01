import { z } from "zod";

export const SEOUL_DISTRICTS = [
  "gangnam", "gangdong", "gangbuk", "gangseo", "gwanak", "gwangjin", "guro", "geumcheon",
  "nowon", "dobong", "dongdaemun", "dongjak", "mapo", "seodaemun", "seocho", "seongdong",
  "seongbuk", "songpa", "yangcheon", "yeongdeungpo", "yongsan", "eunpyeong", "jongno",
  "jung", "jungnang",
] as const;

export const ROOM_OPTIONS = [
  "private_bathroom", "wifi", "desk", "air_conditioner", "heating", "washer", "kitchen", "balcony",
] as const;
export type RoomOption = (typeof ROOM_OPTIONS)[number];

export type SeoulDistrict = (typeof SEOUL_DISTRICTS)[number];

const text = (max: number) => z.string().trim().max(max);

export const propertyInput = z.object({
  title: text(120).min(1),
  description: text(5000).min(1),
  address: text(300).min(1),
  addressDetail: text(200).optional(),
  district: z.enum(SEOUL_DISTRICTS),
  amenities: z.array(text(60).min(1)).max(50),
  houseRules: text(5000),
});
export type PropertyInput = z.infer<typeof propertyInput>;

const money = z.number().int().min(0).max(100_000_000);

export const roomInput = z.object({
  name: text(120).min(1),
  roomType: z.enum(["PRIVATE", "SHARED", "STUDIO"]),
  capacity: z.number().int().min(1).max(8),
  monthlyRent: money,
  deposit: money,
  options: z
    .array(z.enum(ROOM_OPTIONS))
    .max(50)
    .transform((o) => [...new Set(o)]),
});
export type RoomInput = z.infer<typeof roomInput>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const roomBlockInput = z.object({
  startDate: dateOnly,
  endDate: dateOnly,
  reason: text(300),
});
export type RoomBlockInput = z.infer<typeof roomBlockInput>;
