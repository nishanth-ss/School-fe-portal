import StudentProfileCard from "../components/student/StudentProfileCard";
import { useStudentProfile } from "../hooks/useStudentExactQuery";

export default function StudentProfilePage() {
  const { data, isLoading } = useStudentProfile("STU002");

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <StudentProfileCard student={data?.data} />
    </div>
  );
}
