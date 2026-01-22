import api from "../lib/axios";

export const searchStudentExact = async (exactData) => {
  const res = await api.get("student", { params: { exactData } });
  return res.data; // { success, data: [...] }
};

export const getStudents = async ({ search = "", page = 1, limit = 10 }) => {
  const res = await api.get("student", {
    params: { search, page, limit },
  });
  return res.data;
};

export const createStudent = async (data) => {
  const res = await api.post("student/create", data);
  return res.data;
};

export const updateStudent = async ({ id, data }) => {
  const res = await api.put(`student/${id}`, data);
  return res.data;
};

export const deleteStudent = async (studentId) => {
  const res = await api.delete(`student/${studentId}`);
  return res.data;
};

export async function getStudentProfile(registrationNumber) {
  if (!registrationNumber) throw new Error("registrationNumber is required");

  const res = await api.get(`student/profile/${registrationNumber}`);
  // Your API returns: { success, data, message }
  return res.data;
}

export async function getStudentTransactions(registrationNumber, page = 1, limit = 10) {
  if (!registrationNumber) throw new Error("registrationNumber is required");

  const res = await api.get(
    `student/student-transaction/${registrationNumber}`,
    { params: { page, limit } }
  );

  // returns:
  // { success, student, total, page, limit, totalPages, transactions }
  return res.data;
}

export async function fetchStudentByFace(descriptor) {
  const res = await api.post("student/fetch-by-face", { descriptor });
  return res.data; // { success, data, message }
}