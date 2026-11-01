-- 이중 예약 방지: 같은 방에서 APPROVED/CONFIRMED 예약의 [checkIn, checkOut) 기간이 겹치면 거부한다.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist ("roomId" WITH =, daterange("checkIn", "checkOut") WITH &&)
  WHERE (status IN ('APPROVED', 'CONFIRMED'));
