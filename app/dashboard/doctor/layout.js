export const metadata = {
  title: 'Doctor Dashboard',
  description: 'Veterinary management for the goshala',
};

export default function DoctorLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}


