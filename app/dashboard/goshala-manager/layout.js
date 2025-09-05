export const metadata = {
  title: 'Goshala Manager Dashboard',
  description: 'Overall management dashboard for the goshala',
};

export default function GoshalaManagerLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}


