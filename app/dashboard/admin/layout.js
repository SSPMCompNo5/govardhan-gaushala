import AdminLayoutClient from "./layout-client";

export const metadata = {
  title: "Admin Dashboard"
};

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
