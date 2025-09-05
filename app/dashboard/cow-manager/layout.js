export const metadata = {
  title: 'Cow Manager Dashboard',
  description: 'Cow management dashboard for herd, health, and routines',
};

export default function CowManagerLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}


