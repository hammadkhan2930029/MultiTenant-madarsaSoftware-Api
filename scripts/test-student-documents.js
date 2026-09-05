import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../src/config/prisma.js';
import { studentsService } from '../src/modules/students/students.service.js';

const student = await prisma.student.findFirst({
  where: { branchId: { not: null } },
  select: { id: true, tenantId: true, branchId: true },
});
if (!student?.branchId) throw new Error('No branch-scoped student is available for document test');

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'student-documents');
const fileName = `document-test-${crypto.randomUUID()}.pdf`;
const filePath = path.join(uploadDirectory, fileName);
const branchScope = {
  branchId: student.branchId,
  resolvedBranchId: student.branchId,
  requestedBranchId: student.branchId,
  isBranchScoped: true,
};
let documentId;

try {
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(filePath, '%PDF-1.4\n% secure document test\n');
  const document = await prisma.studentDocument.create({
    data: {
      tenantId: student.tenantId,
      branchId: student.branchId,
      studentId: student.id,
      originalName: 'test-document.pdf',
      fileName,
      fileUrl: `/uploads/student-documents/${fileName}`,
      mimeType: 'application/pdf',
      fileSize: 34,
    },
  });
  documentId = document.id;

  const allowed = await studentsService.getStudentDocumentFile(
    student.tenantId,
    student.id,
    document.id,
    branchScope,
  );
  if (allowed.filePath !== filePath || allowed.mimeType !== 'application/pdf') {
    throw new Error('Authorized document did not resolve correctly');
  }
  console.log('PASS authorized tenant/branch document access');

  let crossTenantRejected = false;
  try {
    await studentsService.getStudentDocumentFile(
      student.tenantId + 999999,
      student.id,
      document.id,
      branchScope,
    );
  } catch (error) {
    crossTenantRejected = [403, 404].includes(error?.statusCode);
  }
  if (!crossTenantRejected) throw new Error('Cross-tenant document access was not rejected');
  console.log('PASS cross-tenant document access rejected');

  await fs.unlink(filePath);
  let missingFileRejected = false;
  try {
    await studentsService.getStudentDocumentFile(
      student.tenantId,
      student.id,
      document.id,
      branchScope,
    );
  } catch (error) {
    missingFileRejected = error?.statusCode === 404;
  }
  if (!missingFileRejected) throw new Error('Missing storage file was not handled safely');
  console.log('PASS missing storage file returns a safe not-found response');
} finally {
  if (documentId) await prisma.studentDocument.deleteMany({ where: { id: documentId } });
  await fs.unlink(filePath).catch(() => {});
  await prisma.$disconnect();
}
