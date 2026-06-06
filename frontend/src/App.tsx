import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { RideDetails } from './pages/RideDetails';
import { AdminDashboard } from './pages/AdminDashboard';
import { RiderBookings } from './pages/RiderBookings';
import { VTUDashboard } from './pages/VTUDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DriverDashboard } from './pages/DriverDashboard';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { DriverRoutes } from './pages/DriverRoutes';
import { Chat } from './pages/Chat';
import { Notifications } from './pages/Notifications';
import { Booking } from './pages/Booking';
import { CreateRidePage } from './pages/CreateRidePage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* VTU / Services */}
        <Route path="/airtime/*" element={<ProtectedRoute><VTUDashboard /></ProtectedRoute>} />
        <Route path="/data/*" element={<ProtectedRoute><VTUDashboard /></ProtectedRoute>} />
        <Route path="/tv-subscriptions/*" element={<ProtectedRoute><VTUDashboard /></ProtectedRoute>} />
        <Route path="/electricity/*" element={<ProtectedRoute><VTUDashboard /></ProtectedRoute>} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Rider routes */}
        <Route path="/rider/ride/:id" element={
          <ProtectedRoute requiredRole="rider"><RideDetails /></ProtectedRoute>
        } />
        <Route path="/rider/bookings" element={
          <ProtectedRoute requiredRole="rider"><RiderBookings /></ProtectedRoute>
        } />
        <Route path="/rider/*" element={
          <ProtectedRoute requiredRole="rider"><Dashboard /></ProtectedRoute>
        } />

        {/* Driver routes */}
        <Route path="/driver/create-ride" element={
          <ProtectedRoute requiredRole="driver"><CreateRidePage /></ProtectedRoute>
        } />
        <Route path="/driver/*" element={
          <ProtectedRoute requiredRole="driver"><DriverDashboard /></ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
        } />

        {/* Booking */}
        <Route path="/booking" element={
          <ProtectedRoute requiredRole="rider"><Booking /></ProtectedRoute>
        } />

        {/* Shared */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
