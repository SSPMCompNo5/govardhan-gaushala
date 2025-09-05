export const metadata = {
  title: 'Food Manager Dashboard',
  description: 'Food management system for the goshala',
};

export default function FoodManagerLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
