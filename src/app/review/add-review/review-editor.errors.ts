import { HttpErrorResponse } from '@angular/common/http';

export function reviewSaveError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'เชื่อมต่อ Backend ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อ ข้อมูลและรูปที่เลือกยังอยู่';
    if (error.status === 401) return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก';
    if (error.status === 403) return 'ไม่มีสิทธิ์บันทึกรีวิว กรุณาตรวจบัญชีที่เข้าสู่ระบบ';
    if (error.status === 429) return 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
    if (error.status === 413) return 'ข้อมูลที่ส่งมีขนาดใหญ่เกินไป กรุณาลดขนาดแล้วลองใหม่';
    if (error.status === 400 || error.status === 422) {
      const message: unknown = error.error?.message;
      const details = typeof message === 'string' ? message : Array.isArray(message) ? message.filter(item => typeof item === 'string').join('; ') : '';
      return 'ข้อมูลไม่ผ่านการตรวจสอบจาก Backend' + (details ? ': ' + details.slice(0, 1000) : ' กรุณาตรวจข้อมูลที่กรอก');
    }
    return `บันทึกไม่สำเร็จ (HTTP ${error.status}) กรุณาตรวจ Backend ข้อมูลและรูปที่เลือกยังอยู่เพื่อให้ลองใหม่ได้`;
  }
  return error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ ข้อมูลและรูปที่เลือกยังอยู่เพื่อให้ลองใหม่ได้';
}
