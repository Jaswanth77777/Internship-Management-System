import { z } from "zod";

export function registerWorkflowRoutes(app, { prisma, authenticate, allow, asyncRoute }) {
  const notify = (userId, title, body) => prisma.notification.create({ data: { userId, title, body } });
  const student = (userId) => prisma.student.findUnique({ where: { userId } });

  app.get("/api/company/internships", authenticate, allow("COMPANY"), asyncRoute(async (req,res) => {
    const c = await prisma.company.findUnique({ where: { userId: req.user.id } });
    if (!c) return res.status(404).json({error:"Company profile not found"});
    res.json(await prisma.internship.findMany({where:{companyId:c.id},include:{_count:{select:{applications:true}}},orderBy:{createdAt:"desc"}}));
  }));
  app.get("/api/company/applications", authenticate, allow("COMPANY"), asyncRoute(async (req,res) => {
    const c = await prisma.company.findUnique({where:{userId:req.user.id}});
    if (!c) return res.status(404).json({error:"Company profile not found"});
    res.json(await prisma.application.findMany({where:{internship:{companyId:c.id}},include:{student:{include:{user:true}},internship:true},orderBy:{appliedAt:"desc"}}));
  }));
  app.patch("/api/company/applications/:id/status", authenticate, allow("COMPANY"), asyncRoute(async(req,res)=>{
    const input=z.object({status:z.enum(["UNDER_REVIEW","SHORTLISTED","OFFERED","REJECTED","ACCEPTED"])}).parse(req.body);
    const row=await prisma.application.findFirst({where:{id:req.params.id,internship:{company:{userId:req.user.id}}},include:{student:true,internship:true}});
    if(!row)return res.status(404).json({error:"Application not found"});
    const updated=await prisma.application.update({where:{id:row.id},data:{status:input.status}});
    const owner=await prisma.user.findUnique({where:{id:row.student.userId}});
    await notify(owner.id,"Application update",`Your application for ${row.internship.title} is now ${input.status.toLowerCase().replaceAll("_"," ")}.`);
    res.json(updated);
  }));

  app.get("/api/faculty/students", authenticate, allow("FACULTY"), asyncRoute(async(req,res)=>{
    const f=await prisma.faculty.findUnique({where:{userId:req.user.id}});
    if(!f)return res.status(404).json({error:"Faculty profile not found"});
    const rows=await prisma.facultyAllocation.findMany({where:{facultyId:f.id},include:{student:{include:{user:true,weeklyLogs:true,nocRequests:true,applications:true}}}});
    res.json(rows.map(x=>x.student));
  }));
  app.get("/api/faculty/available-students", authenticate, allow("FACULTY"), asyncRoute(async(_req,res)=>{
    res.json(await prisma.student.findMany({include:{user:{select:{name:true,email:true}}},orderBy:{user:{name:"asc"}}}));
  }));
  app.post("/api/faculty/allocations", authenticate, allow("FACULTY"), asyncRoute(async(req,res)=>{
    const input=z.object({studentId:z.string()}).parse(req.body);
    const f=await prisma.faculty.findUnique({where:{userId:req.user.id}});
    if(!f||!(await prisma.student.findUnique({where:{id:input.studentId}})))return res.status(404).json({error:"Faculty or student profile not found"});
    res.status(201).json(await prisma.facultyAllocation.upsert({where:{facultyId_studentId:{facultyId:f.id,studentId:input.studentId}},create:{facultyId:f.id,studentId:input.studentId},update:{}}));
  }));
  app.get("/api/faculty/nocs", authenticate, allow("FACULTY"), asyncRoute(async(_req,res)=>{
    res.json(await prisma.nocRequest.findMany({where:{status:"PENDING"},include:{student:{include:{user:true}}},orderBy:{createdAt:"asc"}}));
  }));
  app.patch("/api/faculty/nocs/:id", authenticate, allow("FACULTY"), asyncRoute(async(req,res)=>{
    const input=z.object({status:z.enum(["APPROVED","REJECTED"]),remarks:z.string().max(1000).optional()}).parse(req.body);
    const f=await prisma.faculty.findUnique({where:{userId:req.user.id}});
    const row=await prisma.nocRequest.findUnique({where:{id:req.params.id},include:{student:true}});
    if(!f||!row)return res.status(404).json({error:"NOC request not found"});
    const updated=await prisma.nocRequest.update({where:{id:row.id},data:{...input,reviewerId:f.id}});
    const owner=await prisma.user.findUnique({where:{id:row.student.userId}});
    await notify(owner.id,"NOC decision",`Your NOC request was ${input.status.toLowerCase()}.`);
    res.json(updated);
  }));
  app.get("/api/faculty/logbook", authenticate, allow("FACULTY"), asyncRoute(async(req,res)=>{
    const f=await prisma.faculty.findUnique({where:{userId:req.user.id}});
    if(!f)return res.status(404).json({error:"Faculty profile not found"});
    const ids=(await prisma.facultyAllocation.findMany({where:{facultyId:f.id},select:{studentId:true}})).map(x=>x.studentId);
    res.json(await prisma.weeklyLog.findMany({where:{studentId:{in:ids}},include:{student:{include:{user:true}}},orderBy:{createdAt:"desc"}}));
  }));
  app.patch("/api/faculty/logbook/:id", authenticate, allow("FACULTY"), asyncRoute(async(req,res)=>{
    const input=z.object({status:z.enum(["APPROVED","REVISION_REQUIRED"]),feedback:z.string().max(2000).optional()}).parse(req.body);
    const f=await prisma.faculty.findUnique({where:{userId:req.user.id}});
    const log=await prisma.weeklyLog.findUnique({where:{id:req.params.id},include:{student:true}});
    if(!f||!log||!(await prisma.facultyAllocation.findUnique({where:{facultyId_studentId:{facultyId:f.id,studentId:log.studentId}}})))return res.status(404).json({error:"Allocated logbook entry not found"});
    const updated=await prisma.weeklyLog.update({where:{id:log.id},data:{...input,reviewerId:f.id}});
    const owner=await prisma.user.findUnique({where:{id:log.student.userId}});
    await notify(owner.id,"Logbook reviewed",`Your weekly log was marked ${input.status.toLowerCase().replaceAll("_"," ")}.`);
    res.json(updated);
  }));

  app.post("/api/nocs", authenticate, allow("STUDENT"), asyncRoute(async(req,res)=>{
    const input=z.object({purpose:z.string().min(5).max(1000)}).parse(req.body);
    const s=await student(req.user.id); if(!s)return res.status(404).json({error:"Student profile not found"});
    res.status(201).json(await prisma.nocRequest.create({data:{studentId:s.id,purpose:input.purpose}}));
  }));
  app.get("/api/nocs/mine", authenticate, allow("STUDENT"), asyncRoute(async(req,res)=>{
    const s=await student(req.user.id); res.json(await prisma.nocRequest.findMany({where:{studentId:s.id},orderBy:{createdAt:"desc"}}));
  }));

  app.get("/api/admin/users", authenticate, allow("ADMIN"), asyncRoute(async(_req,res)=>{
    res.json(await prisma.user.findMany({select:{id:true,name:true,email:true,role:true,isActive:true,createdAt:true},orderBy:{createdAt:"desc"}}));
  }));
  app.patch("/api/admin/users/:id", authenticate, allow("ADMIN"), asyncRoute(async(req,res)=>{
    const input=z.object({isActive:z.boolean()}).parse(req.body);
    if(req.params.id===req.user.id&&!input.isActive)return res.status(400).json({error:"You cannot deactivate your own account"});
    res.json(await prisma.user.update({where:{id:req.params.id},data:input,select:{id:true,name:true,email:true,role:true,isActive:true}}));
  }));
  app.get("/api/admin/companies", authenticate, allow("ADMIN"), asyncRoute(async(_req,res)=>{
    res.json(await prisma.company.findMany({include:{user:{select:{name:true,email:true}},_count:{select:{internships:true}}},orderBy:{legalName:"asc"}}));
  }));
  app.patch("/api/admin/companies/:id/verify", authenticate, allow("ADMIN"), asyncRoute(async(req,res)=>{
    const input=z.object({verified:z.boolean()}).parse(req.body);
    const c=await prisma.company.update({where:{id:req.params.id},data:{verified:input.verified,approvalStatus:input.verified?"APPROVED":"PENDING"}});
    await notify(c.userId,"Company verification",input.verified?"Your company has been verified.":"Your company verification is pending.");
    res.json(c);
  }));
  app.get("/api/admin/internships", authenticate, allow("ADMIN"), asyncRoute(async(_req,res)=>{
    res.json(await prisma.internship.findMany({include:{company:true,_count:{select:{applications:true}}},orderBy:{createdAt:"desc"}}));
  }));
  app.patch("/api/admin/internships/:id/status", authenticate, allow("ADMIN"), asyncRoute(async(req,res)=>{
    const input=z.object({status:z.enum(["OPEN","CLOSED","PENDING_APPROVAL"])}).parse(req.body);
    res.json(await prisma.internship.update({where:{id:req.params.id},data:{status:input.status}}));
  }));
  app.get("/api/notifications", authenticate, asyncRoute(async(req,res)=>{
    res.json(await prisma.notification.findMany({where:{userId:req.user.id},orderBy:{createdAt:"desc"},take:50}));
  }));
  app.patch("/api/notifications/:id/read", authenticate, asyncRoute(async(req,res)=>{
    const result=await prisma.notification.updateMany({where:{id:req.params.id,userId:req.user.id},data:{readAt:new Date()}});
    res.json({updated:result.count});
  }));
}
