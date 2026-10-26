import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { RequireAuth, RequireVerified, RequireAdmin, GuestOnly } from './components/layout/RouteGuards.jsx';
import AppShell from './components/layout/AppShell.jsx';
import { PageLoader } from './components/ui/index.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const Verification = lazy(() => import('./pages/Verification.jsx'));
const Marketplace = lazy(() => import('./pages/Marketplace.jsx'));
const ItemDetail = lazy(() => import('./pages/ItemDetail.jsx'));
const ItemForm = lazy(() => import('./pages/ItemForm.jsx'));
const MyListings = lazy(() => import('./pages/MyListings.jsx'));
const Requests = lazy(() => import('./pages/Requests.jsx'));
const Businesses = lazy(() => import('./pages/Businesses.jsx'));
const BusinessDetail = lazy(() => import('./pages/BusinessDetail.jsx'));
const BusinessForm = lazy(() => import('./pages/BusinessForm.jsx'));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard.jsx'));
const Chat = lazy(() => import('./pages/Chat.jsx'));
const WalletPage = lazy(() => import('./pages/Wallet.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Admin = lazy(() => import('./pages/admin/Admin.jsx'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verification" element={<Verification />} />

          <Route element={<RequireVerified />}>
            <Route element={<AppShell />}>
              <Route path="/market" element={<Marketplace />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/sell" element={<ItemForm />} />
              <Route path="/sell/:id" element={<ItemForm />} />
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/businesses" element={<Businesses />} />
              <Route path="/businesses/:id" element={<BusinessDetail />} />
              <Route path="/business" element={<BusinessDashboard />} />
              <Route path="/business/new" element={<BusinessForm />} />
              <Route path="/business/:id/edit" element={<BusinessForm />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
