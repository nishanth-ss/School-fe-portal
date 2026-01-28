import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LocationDialog from "../components/location/LocationDialog";
import { useState } from "react";
import Button from "@mui/material/Button";
import { DatabaseZap, MapPin, User } from "lucide-react";
import { useLocationCtx } from "../context/LocationContext";
import DBLocationModal from "../components/location/DBLocationModal";

import { useDBCtx } from "../context/DBContext";
import Sidebar from "../components/Sidebar.jsx";

export default function LayoutContainer() {
  const { user } = useAuth();
  const [locationModal, setLocationModal] = useState(false);
  const [dbModal, setDbModal] = useState(false);

  const { selectedLocation } = useLocationCtx();
  const { dbPath } = useDBCtx();



  return (
    <div className="min-h-screen grid grid-cols-[15%_85%] bg-slate-100">
      {/* Sidebar */}
      <Sidebar />

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
