import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Search, ChevronLeft } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, UserRole } from '../types';

interface UserManagementModalProps {
  onClose: () => void;
}

export default function UserManagementModal({ onClose }: UserManagementModalProps) {
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<(UserProfile & { id: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'conductor' | 'cliente'>('usuarios');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (UserProfile & { id: string })[];
      
      // Deduplicate by email and role (keep the latest or first found)
      const seen = new Set();
      const deduplicated = usersList.filter(u => {
        const key = `${u.email}_${u.role}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setUsers(deduplicated);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === 'usuarios') return true;
    return u.role === activeTab;
  });

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
    } catch (e) {
      console.error('Error updating role:', e);
    }
  };

  const handlePhoneChange = async (newPhone: string) => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, { phone: newPhone });
      
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, phone: newPhone } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, phone: newPhone } : null);
    } catch (e) {
      console.error('Error updating phone:', e);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              {selectedUser ? (
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <ChevronLeft size={20} />
                </button>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <Shield size={20} className="text-emerald-600" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-800">
                  {selectedUser ? 'Perfil del Usuario' : 'Gestión de Usuarios'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedUser ? 'Detalles y accesos' : 'Administra el acceso y roles'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : selectedUser ? (
              /* Detalle del Usuario */
              <div className="flex flex-col items-center pt-4">
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt={selectedUser.name} className="w-20 h-20 rounded-full mb-3 object-cover shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-pink-100 text-pink-600 font-bold text-2xl flex items-center justify-center mb-3 shadow-sm">
                    {getInitials(selectedUser.name)}
                  </div>
                )}
                <h2 className="text-xl font-bold text-slate-800">{selectedUser.name}</h2>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>

                <div className="w-full bg-white rounded-2xl p-4 mt-8 shadow-sm border border-slate-100 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    DATOS DEL USUARIO
                  </p>
                  
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Nivel de acceso</span>
                    <select
                      value={selectedUser.role || 'cliente'}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="conductor">Conductor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Teléfono</span>
                    <input
                      type="tel"
                      value={selectedUser.phone || ''}
                      onChange={(e) => {
                        const newPhone = e.target.value;
                        setSelectedUser(prev => prev ? { ...prev, phone: newPhone } : null);
                      }}
                      onBlur={(e) => handlePhoneChange(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 font-medium w-36 text-right"
                    />
                  </div>
                </div>

                <div className="w-full bg-white rounded-2xl p-4 mt-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    ESTADÍSTICAS FINANCIERAS
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">BALANCE</p>
                      <p className="text-lg font-bold text-emerald-600">
                        ${(selectedUser.balance || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de Usuarios */
              <div className="flex flex-col h-full">
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'usuarios' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setActiveTab('conductor')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'conductor' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Conductores
                  </button>
                  <button
                    onClick={() => setActiveTab('cliente')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'cliente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Clientes
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pb-4">
                  {filteredUsers.map((u) => (
                    <div 
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center text-xs">
                            {getInitials(u.name)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {u.role || 'USUARIO'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && !loading && (
                    <p className="text-center text-sm text-slate-500 mt-10">No se encontraron usuarios.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
