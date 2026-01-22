import React from "react";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-b-0">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900 text-right break-words">
        {value ?? "-"}
      </div>
    </div>
  );
}

export default function StudentProfileCard({ student }) {
  if (!student) return null;

  const dob = student?.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString()
    : "-";

  return (
    <div className="w-full bg-white rounded-xl shadow-md border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {student.student_name || "Student"}
          </h2>
          <p className="text-sm text-gray-500">
            Registration No: {student.registration_number}
          </p>
        </div>
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500">Class</p>
          <p className="font-semibold text-gray-800">
            {student?.class_info?.class_name ?? "-"} -{" "}
            {student?.class_info?.section ?? "-"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Academic Year: {student?.class_info?.academic_year ?? "-"}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-xs text-gray-500">Location</p>
          <p className="font-semibold text-gray-800">
            {student?.location_id?.locationName ?? "-"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Gender: {student?.gender ?? "-"}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="border rounded-lg px-4">
        <Row label="Mother Name" value={student.mother_name} />
        <Row label="Father Name" value={student.father_name} />
        <Row label="Contact Number" value={student.contact_number} />
        <Row label="Date of Birth" value={dob} />
        <Row label="Birth Place" value={student.birth_place} />
        <Row label="Nationality" value={student.nationality} />
        <Row label="Mother Tongue" value={student.mother_tongue} />
        <Row label="Blood Group" value={student.blood_group} />
        <Row label="Religion" value={student.religion} />
        <Row label="Deposit Amount" value={student.deposite_amount} />
      </div>
    </div>
  );
}
