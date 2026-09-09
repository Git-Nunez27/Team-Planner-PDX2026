export const employees = [
  {id:7,code:'GM001',name:'วรรณา ศรีสุข',role:'GM',dept:'Executive',active:true,password:'gm1234'},
  {id:1,code:'EMP001',name:'สมชาย ใจดี',role:'Supervisor',dept:'Operations',active:true,managerId:3,password:'1234'},
  {id:2,code:'EMP002',name:'วิชัย พรหมดี',role:'Supervisor',dept:'Operations',active:true,managerId:3,password:'1234'},
  {id:3,code:'EMP003',name:'กิตติ รุ่งเรือง',role:'PM',dept:'Operations',active:true,password:'1234'},
  {id:6,code:'EMP006',name:'ภัทร เจริงศิลป์',role:'PM',dept:'Sales',active:true,password:'1234'},
  {id:4,code:'EMP004',name:'พิมพ์ชนก แสงทอง',role:'Supervisor',dept:'Sales',active:true,managerId:6,password:'1234'},
  {id:5,code:'EMP005',name:'อรทัย สุขใจ',role:'Supervisor',dept:'Sales',active:true,managerId:6,password:'1234'}
]
export const plans = [
  {id:1,empId:1,date:'2026-09-03',task:'ตรวจสอบยอดขายประจำวัน',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:2,empId:2,date:'2026-09-03',task:'จัดทำรายงานสต๊อก',priority:'Normal',status:'Pending'},
  {id:3,empId:4,date:'2026-09-03',task:'ประสานงานสาขา',priority:'Normal',status:'Pending'},
  {id:4,empId:5,date:'2026-09-04',task:'ติดตามเอกสาร',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:5,empId:1,date:'2026-09-04',task:'สรุปผลการดำเนินงานประจำสัปดาห์',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:6,empId:1,date:'2026-09-05',task:'ตรวจนับและปรับปรุงข้อมูลสต๊อกสินค้า',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:7,empId:1,date:'2026-09-06',task:'ประสานงานคำสั่งซื้อกับทีมขาย',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:8,empId:1,date:'2026-09-07',task:'ตรวจสอบเอกสารการจัดส่งสินค้า',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:9,empId:1,date:'2026-09-08',task:'ติดตามสถานะงานค้างและแจ้งทีมที่เกี่ยวข้อง',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:10,empId:1,date:'2026-09-09',task:'วางแผนงานและจัดลำดับความสำคัญสำหรับสัปดาห์ถัดไป',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:11,empId:1,date:'2026-09-01',task:'ตรวจสอบยอดขายประจำวัน',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:12,empId:2,date:'2026-09-02',task:'จัดทำรายงานสต๊อกสินค้า',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:13,empId:4,date:'2026-09-10',task:'ประสานงานฝ่ายจัดส่ง',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:14,empId:5,date:'2026-09-11',task:'ติดตามความคืบหน้าโครงการ',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:15,empId:1,date:'2026-09-12',task:'สรุปข้อมูลลูกค้าประจำสัปดาห์',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:16,empId:2,date:'2026-09-13',task:'ตรวจสอบเอกสารการเงิน',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:17,empId:4,date:'2026-09-14',task:'วางแผนงานสัปดาห์ถัดไป',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:18,empId:5,date:'2026-09-15',task:'ประชุมทีมประจำวัน',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:19,empId:1,date:'2026-09-16',task:'ตรวจสอบยอดขายประจำวัน',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:20,empId:2,date:'2026-09-17',task:'จัดทำรายงานสต๊อกสินค้า',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:21,empId:4,date:'2026-09-18',task:'ประสานงานฝ่ายจัดส่ง',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:22,empId:5,date:'2026-09-19',task:'ติดตามความคืบหน้าโครงการ',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:23,empId:1,date:'2026-09-20',task:'สรุปข้อมูลลูกค้าประจำสัปดาห์',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:24,empId:2,date:'2026-09-21',task:'ตรวจสอบเอกสารการเงิน',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:25,empId:4,date:'2026-09-22',task:'วางแผนงานสัปดาห์ถัดไป',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:26,empId:5,date:'2026-09-23',task:'ประชุมทีมประจำวัน',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:27,empId:1,date:'2026-09-24',task:'ตรวจสอบยอดขายประจำวัน',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:28,empId:2,date:'2026-09-25',task:'จัดทำรายงานสต๊อกสินค้า',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:29,empId:4,date:'2026-09-26',task:'ประสานงานฝ่ายจัดส่ง',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:30,empId:5,date:'2026-09-27',task:'ติดตามความคืบหน้าโครงการ',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:31,empId:1,date:'2026-09-28',task:'สรุปข้อมูลลูกค้าประจำสัปดาห์',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:32,empId:2,date:'2026-09-29',task:'ตรวจสอบเอกสารการเงิน',priority:'Normal',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:33,empId:4,date:'2026-09-30',task:'วางแผนงานสัปดาห์ถัดไป',priority:'High',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'},
  {id:34,empId:5,date:'2026-10-01',task:'ประชุมทีมประจำวัน',priority:'Low',status:'Approved',approvedBy:'กิตติ รุ่งเรือง'}
]
export const history = [
  {id:1,planId:1,action:'Approved',by:'กิตติ รุ่งเรือง',time:'03/09/2026 09:15',comment:'เรียบร้อย'}
]
export const adminAccount = {id:100,name:'System Admin',role:'Admin',password:'admin1234'}
