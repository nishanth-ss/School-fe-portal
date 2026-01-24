import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import LocationDialog from "../components/location/LocationDialog";
import { useState } from "react";
import Button from "@mui/material/Button";
import { DatabaseZap, MapPin, User } from "lucide-react";
import { useLocationCtx } from "../context/LocationContext";
import DBLocationModal from "../components/location/DBLocationModal";

// import your icons used in sideBarItems
import {
  Grid,
  LayoutDashboard,
  Users,
  ReceiptIndianRupee,
  Store,
  ArrowLeftRight,
  FileText,
  Upload,
  UserRoundPen,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { useDBCtx } from "../context/DBContext";

const linkBase = "block rounded-lg px-3 py-2 text-sm font-medium transition";
const linkActive = "bg-white/15 text-white";
const linkIdle = "text-white/80 hover:bg-white/10 hover:text-white";

const sideBarItems = [
  { title: "Super Dashboard", icon: Grid, path: "/super-dashboard", roles: ["SUPER ADMIN"] },
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["ADMIN"] },
  { title: "Student Management", icon: Users, path: "/student-management", roles: ["ADMIN"] },
  { title: "Canteen Deposit", icon: ReceiptIndianRupee, path: "/financial-management", roles: ["ADMIN"] },
  { title: "Transaction History", icon: ArrowLeftRight, path: "/transaction-history", roles: ["ADMIN"] },
  { title: "Canteen POS", icon: Store, path: "/tuck-shop-pos", roles: ["ADMIN", "POS"] },
  { title: "Reports", icon: FileText, path: "/reports", roles: ["ADMIN"] },
  { title: "Bulk Operations", icon: Upload, path: "/bulk-operations", roles: ["ADMIN"] },
  { title: "User Management", icon: UserRoundPen, path: "/user-management", roles: ["ADMIN"] },
  { title: "Inventory", icon: ShoppingBag, path: "/inventory", roles: ["ADMIN"] },
  { title: "Audit Trails", icon: ShieldCheck, path: "/audit-trails", roles: ["ADMIN"] },
  { title: "Student Profile", icon: Users, path: "/student-profile", roles: ["STUDENT", "student"] },
  { title: "Student Transaction", icon: ArrowLeftRight, path: "/student-transaction", roles: ["STUDENT", "student"] },
];

export default function LayoutContainer() {
  const { user, logout } = useAuth();
  const [locationModal, setLocationModal] = useState(false);
  const [dbModal, setDbModal] = useState(false);

  const { selectedLocation } = useLocationCtx();
  const { dbPath } = useDBCtx();

  const role = (user?.role || "").toUpperCase();
  const allowedItems = sideBarItems.filter((item) =>
    item.roles?.some((r) => r.toUpperCase() === role)
  );

  return (
    <div className="min-h-screen grid grid-cols-[15%_85%] bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-primary text-white flex flex-col">
        <div className="px-8 bg-white m-2 rounded-2xl flex items-center border-b border-white/15">
          <img src={logo} alt="logo" className="p-2" />
        </div>

        {/* ✅ Dynamic menu */}
        <nav className="p-3 space-y-1 flex-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkIdle}`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/15">
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-secondary text-black hover:brightness-95"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-md font-semibold">{user?.fullName}</h1>
              <h3 className="text-green-500 text-md font-semibold">{user?.role}</h3>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Location */}
          {user?.role === "ADMIN" && <div className="flex flex-col items-center">
              <Button variant="text" onClick={() => setLocationModal(true)}>
                <MapPin
                  className={`w-5 h-5 ${
                    selectedLocation?.locationName ? "text-green-500" : "text-red-500"
                  }`}
                />
              </Button>
              {selectedLocation?.locationName ? (
                <span className="text-sm font-bold text-green-700">
                  {selectedLocation.locationName}
                </span>
              ) : (
                <span className="text-sm font-bold text-red-500">No Location Selected</span>
              )}
            </div>}

            {/* DB Location */}
           {user?.role === "ADMIN" && <div className="flex flex-col items-center">
              <Button variant="text" onClick={() => setDbModal(true)}>
                <DatabaseZap className={`w-5 h-5 ${dbPath ? "text-green-500" : "text-red-500"}`} />
              </Button>
              <span className={`font-bold text-sm ${dbPath ? "text-green-700" : "text-red-500"}`}>
                DB Location
              </span>
            </div>}
          </div>
        </header>

        <main className="flex-1 m-4">
          <Outlet />
        </main>
      </div>

      <LocationDialog
        open={locationModal}
        onClose={() => setLocationModal(false)}
        isEdit={selectedLocation?._id}
        selectedLocation={selectedLocation}
      />

      <DBLocationModal open={dbModal} onClose={() => setDbModal(false)} />
    </div>
  );
}
