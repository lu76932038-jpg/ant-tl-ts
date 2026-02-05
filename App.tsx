import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Layout from './pages/Layout';
import MainApp from './pages/MainApp';
import UserManagement from './pages/UserManagement';
import LoginLogs from './pages/LoginLogs';
import ProfileInfo from './pages/ProfileInfo';
import ChangePassword from './pages/ChangePassword';
import HelpDocs from './pages/HelpDocs';
import AtOrders from './pages/AtOrders';
import TrainTicketZip from './pages/TrainTicketZip';
import StockList from './pages/stock/StockList';
import ShipList from './pages/stock/ShipList';
import EntryList from './pages/stock/EntryList';
import PurchaseOrderList from './pages/stock/PurchaseOrderList';
import PurchasePlanList from './pages/stock/PurchasePlanList';
import ProductDetail from './pages/stock/ProductDetail';
import StockDefaults from './pages/stock/StockDefaults';
import Community from './pages/community/Community';
import CommunityDetail from './pages/community/CommunityDetail';
import StockCommandCenter from './pages/stock/StockCommandCenter';
import DashboardHome from './pages/DashboardHome';
import InquiryList from './pages/inquiry/InquiryList';
import InquiryDetail from './pages/inquiry/InquiryDetail';
import StockHelpCenter from './pages/stock/StockHelpCenter';
import FeedbackPage from './pages/feedback/FeedbackPage';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/train-ticket-zip" element={<TrainTicketZip />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Protected Routes */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<DashboardHome />} />
                        <Route path="inquiry-history" element={<InquiryList />} />
                        <Route path="inquiry/:id" element={<InquiryDetail />} />
                        <Route path="profile" element={<ProfileInfo />} />
                        <Route path="change-password" element={<ChangePassword />} />
                        <Route path="help" element={<HelpDocs />} />
                        <Route path="at-orders" element={<AtOrders />} />
                        <Route path="community" element={<Community />} />
                        <Route path="community/:id" element={<CommunityDetail />} />

                        {/* 备货助手 (需要 stock_list 权限) */}
                        <Route element={
                            <ProtectedRoute requiredPermission="stock_list">
                                <Outlet />
                            </ProtectedRoute>
                        }>
                            <Route path="stock" element={<StockList />} />
                            <Route path="stock/defaults" element={<StockDefaults />} />
                            <Route path="stock/shiplist" element={<StockList />} />
                            <Route path="stock/outbound" element={<ShipList />} />
                            <Route path="stock/entrylist" element={<EntryList />} />
                            <Route path="stock/purchase-plans" element={<PurchasePlanList />} />
                            <Route path="stock/purchase-orders" element={<PurchaseOrderList />} />
                            <Route path="stock/product/:sku" element={<ProductDetail />} />
                            <Route path="stock/help" element={<StockHelpCenter />} />
                        </Route>

                        <Route path="feedback" element={<FeedbackPage />} />

                        <Route
                            path="train-invoice"
                            element={
                                <ProtectedRoute requiredPermission="train_invoice">
                                    <TrainTicketZip />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="users"
                            element={
                                <ProtectedRoute requireAdmin>
                                    <UserManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="login-logs"
                            element={
                                <ProtectedRoute requireAdmin>
                                    <LoginLogs />
                                </ProtectedRoute>
                            }
                        />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
