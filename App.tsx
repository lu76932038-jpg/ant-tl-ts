import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import ProductDetail from './pages/stock/ProductDetail';
import InquiryList from './pages/inquiry/InquiryList';
import InquiryDetail from './pages/inquiry/InquiryDetail';

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
                        <Route index element={<InquiryList />} />
                        <Route path="inquiry-history" element={<InquiryList />} />
                        <Route path="inquiry/:id" element={<InquiryDetail />} />
                        <Route path="profile" element={<ProfileInfo />} />
                        <Route path="change-password" element={<ChangePassword />} />
                        <Route path="help" element={<HelpDocs />} />
                        <Route path="at-orders" element={<AtOrders />} />

                        {/* 备货小助手 */}
                        <Route path="stock" element={<StockList />} /> {/* 库存概览 */}
                        <Route path="stock/shiplist" element={<StockList />} /> {/* Legacy mapping if needed, or redirect */}
                        <Route path="stock/outbound" element={<ShipList />} /> {/* 出库清单 */}
                        <Route path="stock/entrylist" element={<EntryList />} /> {/* 入库清单 */}
                        <Route path="stock/purchase-orders" element={<PurchaseOrderList />} /> {/* 采购补货 */}
                        <Route path="stock/product/:sku" element={<ProductDetail />} />

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
