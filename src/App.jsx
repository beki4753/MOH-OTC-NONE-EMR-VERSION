import React, { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Dashboard,
  Bar,
  Form,
  Line,
  Pie,
  FAQ,
  Login,
  Geography,
  Calendar,
  NotFoundPage,
  RootLayout,
  ProfilePage,
  HospitalPayment,
  ReportPage,
  BankerComponent,
  CollectedReport,
  AdminDashboard,
} from "./pages";

import { logout as logoutAction } from "./services/user_service.js";
import { getTokenValue, getSession, logout } from "./services/user_service.js";
import useTokenCheck from "./services/useTokenCheck.js";

import {
  OrgUploadManager,
  UserManagment,
  RoleManagment,
  FinancialDashboard,
  PaymentManagementLists,
  EmployeeUploadManager,
  ReportReceiptFetcher,
  PatientRegistration,
  PatientSearch,
  FriendlyAgeFilterDataGrid,
  CBHIUsersManager,
  TrafficAccidentForm,
  TreatmentEntry,
  PaymentManagement,
  UnauthorizedPage,
  ReceiptReversalManager,
  PaymentRecords,
  TreatmentEntryR,
  DischargeForm,
  PaymentTypeLimitForm,
  PaymentTypeForm,
  BahmniOrderPage,
  DoctorPrescription,
  PharmacyPage,
  PharmacyRequestsPage,
} from "./components";

const tokenvalue = getTokenValue();

const token = getSession();

const role = tokenvalue
  ? tokenvalue["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
  : "";

const ProtectedRoute = ({ element, allowedRoles, allowedCategory }) => {
  const userType = tokenvalue?.UserType;

  if (!token) {
    logout();
    return;
  }

  const roleMatched = allowedRoles?.some(
    (item) => item.toLowerCase() === role?.toLowerCase()
  );

  const categoryMatched =
    allowedCategory?.includes("All") ||
    allowedCategory?.some(
      (item) => item.toLowerCase() === userType?.toLowerCase()
    );

  if (allowedRoles && (!roleMatched || !categoryMatched)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return element;
};

const getHomeElementByRole = (role, tokenvalue) => {
  if (role?.toUpperCase() === "USER") {
    const userType = tokenvalue?.UserType?.toUpperCase();
    if (userType === "MLT") return <TreatmentEntry />;
    if (userType === "RADIOLOGY") return <TreatmentEntryR />;
    if (userType === "WARD") return <DischargeForm />;
    if (userType === "PHARMACY") return <PharmacyPage />;
    if (userType === "DOCTOR") return <DoctorPrescription />;
    return <Dashboard />;
  }

  // Admin or any other non-user role
  return <AdminDashboard />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, // Ensuring layout consistency
    errorElement: <NotFoundPage />,
    id: "root",
    loader: getSession,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute element={getHomeElementByRole(role, tokenvalue)} />
        ),
      },
      { path: "login", element: <Login /> },
      { path: "logout", action: logoutAction },
      // { path: "profile", element: <ProtectedRoute element={<Profile />} /> },

      // Role-based protected routes
      {
        path: "UserManagment",
        element: (
          <ProtectedRoute
            element={<UserManagment />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },
      {
        path: "payment-channel",
        element: (
          <ProtectedRoute
            element={<PaymentManagementLists />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },
      {
        path: "payments",
        element: (
          <ProtectedRoute
            element={<HospitalPayment />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "Pharmacy",
        element: (
          <ProtectedRoute
            element={<PharmacyPage />}
            allowedRoles={["User"]}
            allowedCategory={["Pharmacy"]}
          />
        ),
      },
      {
        path: "Pharmacy-hist",
        element: (
          <ProtectedRoute
            element={<PharmacyRequestsPage />}
            allowedRoles={["User"]}
            allowedCategory={["Pharmacy"]}
          />
        ),
      },
      {
        path: "order-page",
        element: (
          <ProtectedRoute
            element={<BahmniOrderPage />}
            allowedRoles={["User"]}
            allowedCategory={["Doctor"]}
          />
        ),
      },
      {
        path: "DoctorPrescr",
        element: (
          <ProtectedRoute
            element={<DoctorPrescription />}
            allowedRoles={["User"]}
            allowedCategory={["Doctor"]}
          />
        ),
      },
      {
        path: "find-patient",
        element: (
          <ProtectedRoute
            element={<ReportReceiptFetcher />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier", "Supervisor"]}
          />
        ),
      },
      {
        path: "patien-reg-cbhi",
        element: (
          <ProtectedRoute
            element={<CBHIUsersManager />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "nurse-page",
        element: (
          <ProtectedRoute
            element={<DischargeForm />}
            allowedRoles={["User"]}
            allowedCategory={["Ward"]}
          />
        ),
      },
      {
        path: "radiology-entry",
        element: (
          <ProtectedRoute
            element={<TreatmentEntryR />}
            allowedRoles={["User"]}
            allowedCategory={["Radiology"]}
          />
        ),
      },
      {
        path: "treatment-entry",
        element: (
          <ProtectedRoute
            element={<TreatmentEntry />}
            allowedRoles={["User"]}
            allowedCategory={["MLT"]}
          />
        ),
      },
      {
        path: "payment-entry",
        element: (
          <ProtectedRoute
            element={<PaymentManagement />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "cash-managment",
        element: (
          <ProtectedRoute
            element={<BankerComponent />}
            allowedRoles={["User"]}
          />
        ),
      },
      {
        path: "money-submission",
        element: (
          <ProtectedRoute
            element={<FinancialDashboard />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "reports",
        element: (
          <ProtectedRoute
            element={<ReportPage />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier", "Supervisor"]}
          />
        ),
      },
      {
        path: "payment-limit",
        element: (
          <ProtectedRoute
            element={<PaymentTypeLimitForm />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },
      {
        path: "reports-new",
        element: (
          <ProtectedRoute
            element={<PaymentRecords />}
            allowedRoles={["User"]}
            allowedCategory={["CASHIER", "SUPERVISOR"]}
          />
        ),
      },
      {
        path: "payment-type",
        element: (
          <ProtectedRoute
            element={<PaymentTypeForm />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },
      {
        path: "collection-reports",
        element: (
          <ProtectedRoute
            element={<CollectedReport />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier", "Supervisor"]}
          />
        ),
      },
      {
        path: "patien-reg-tar",
        element: (
          <ProtectedRoute
            element={<TrafficAccidentForm />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute
            element={<ProfilePage />}
            allowedRoles={["Admin", "User"]}
            allowedCategory={["All"]}
          />
        ),
      },
      {
        path: "BankerManagment",
        element: (
          <ProtectedRoute
            element={<EmployeeUploadManager />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },
      {
        path: "patien-reg",
        element: (
          <ProtectedRoute
            element={<PatientRegistration />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "view-pat",
        element: (
          <ProtectedRoute
            element={<PatientSearch />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "test",
        element: (
          <ProtectedRoute
            element={<FriendlyAgeFilterDataGrid />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "money-refund",
        element: (
          <ProtectedRoute
            element={<ReceiptReversalManager />}
            allowedRoles={["User"]}
            allowedCategory={["Cashier"]}
          />
        ),
      },
      {
        path: "credit-users",
        element: (
          <ProtectedRoute
            element={<OrgUploadManager />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },
      {
        path: "RoleManagment",
        element: (
          <ProtectedRoute
            element={<RoleManagment />}
            allowedRoles={["Admin"]}
            allowedCategory={["Admin"]}
          />
        ),
      },

      // Publicly accessible routes
      { path: "form", element: <ProtectedRoute element={<Form />} /> },
      { path: "bar", element: <ProtectedRoute element={<Bar />} /> },
      { path: "pie", element: <ProtectedRoute element={<Pie />} /> },
      { path: "line", element: <ProtectedRoute element={<Line />} /> },
      { path: "faq", element: <ProtectedRoute element={<FAQ />} /> },
      { path: "calendar", element: <ProtectedRoute element={<Calendar />} /> },
      {
        path: "geography",
        element: <ProtectedRoute element={<Geography />} />,
      },
      { path: "unauthorized", element: <UnauthorizedPage /> },

      // Catch-All Route
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

const queryClient = new QueryClient();

function App() {
  useTokenCheck();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
      {/* <SearchableList /> */}
    </>
  );
}

export default App;
