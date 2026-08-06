import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Maintenance } from './pages/Maintenance';
import { Tracking } from './pages/Tracking';
import { Assets } from './pages/Assets';
import { UsersPage } from './pages/UsersPage';
import { Login } from './pages/Login';
import { useAppStore } from './store';
import { UserAccount } from './types';

export function App() {
  const [user, setUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('cmms_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'maintenance' | 'tracking' | 'assets' | 'users'
  >('dashboard');

  const {
    users,
    departments,
    assets,
    orders,
    categories,
    maintenanceLogs,

    // إدارة المستخدمين
    addUser,
    updateUser,
    deleteUser,

    // إدارة الأقسام
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addSubDepartment,
    deleteSubDepartment,

    // إدارة الأصول
    addAsset,
    updateAsset,
    deleteAsset,
    importAssetsExcel,
    exportAssetsExcel,
    batchImportAssetImages,

    // إدارة طلبات الصيانة
    addOrder,
    receiveOrder,
    updateOrderDetails,
    completeOrder,
    deleteOrder,

    // إدارة متابعة الصيانة
    addCategory,
    addMaintenanceLog,
    deleteMaintenanceLog,

    // ضبط المصنع
    factoryResetAll
  } = useAppStore();

  useEffect(() => {
    if (user) {
      localStorage.setItem('cmms_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cmms_user');
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login users={users} onLogin={setUser} />;
  }

  // في حالة ضبط المصنع الكامل
  const handleFactoryResetWithLogout = async (pass: string) => {
    const res = await factoryResetAll(pass);
    if (res.success) {
      setTimeout(() => {
        setUser(null);
      }, 1500);
    }
    return res;
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
      onFactoryReset={handleFactoryResetWithLogout}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          user={user}
          assets={assets}
          orders={orders}
          departments={departments}
          onNavigate={setActiveTab}
        />
      )}

      {activeTab === 'assets' && (
        <Assets
          user={user}
          departments={departments}
          assets={assets}
          onAddDepartment={addDepartment}
          onUpdateDepartment={updateDepartment}
          onDeleteDepartment={deleteDepartment}
          onAddSubDepartment={addSubDepartment}
          onDeleteSubDepartment={deleteSubDepartment}
          onAddAsset={addAsset}
          onUpdateAsset={updateAsset}
          onDeleteAsset={deleteAsset}
          onBatchImportImages={batchImportAssetImages}
          onExportExcel={exportAssetsExcel}
          onImportExcel={importAssetsExcel}
        />
      )}

      {activeTab === 'maintenance' && (
        <Maintenance
          user={user}
          assets={assets}
          orders={orders}
          onAddOrder={addOrder}
          onReceiveOrder={receiveOrder}
          onUpdateOrderDetails={updateOrderDetails}
          onCompleteOrder={completeOrder}
          onDeleteOrder={deleteOrder}
        />
      )}

      {activeTab === 'tracking' && (
        <Tracking
          user={user}
          departments={departments}
          assets={assets}
          categories={categories}
          maintenanceLogs={maintenanceLogs}
          onAddCategory={addCategory}
          onAddLog={addMaintenanceLog}
          onDeleteLog={deleteMaintenanceLog}
        />
      )}

      {activeTab === 'users' && user.role === 'admin' && (
        <UsersPage
          users={users}
          departments={departments}
          onAddUser={addUser}
          onUpdateUser={updateUser}
          onDeleteUser={deleteUser}
        />
      )}
    </Layout>
  );
}

export default App;
