import { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Plus, Trash2, Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Database States
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');

  // Profile Form States
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // System States
  const [currency, setCurrency] = useState('PHP');
  const [timezone, setTimezone] = useState('Asia/Manila');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCategories();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setFname(data.first_name || '');
        setLname(data.last_name || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: fname,
          last_name: lname,
        });

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          { name: newCatName, type: newCatType, user_id: user.id }
        ])
        .select();

      if (error) throw error;
      if (data) {
        setCategories([...categories, data[0]]);
        setNewCatName('');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const themesList = [
    { id: 'red', name: 'Crimson Core', color: 'bg-red-500' },
    { id: 'blue', name: 'Azure Deep', color: 'bg-blue-500' },
    { id: 'purple', name: 'Amethyst Flow', color: 'bg-purple-500' },
    { id: 'galaxy', name: 'Galaxy Space', color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-text-muted mt-1">Configure profile details, defaults, and custom categories.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar inside settings */}
        <div className="w-full md:w-64 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <User size={18} />
            <span className="font-semibold text-sm">Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'appearance'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <Palette size={18} />
            <span className="font-semibold text-sm">Theme & Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'categories'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <SettingsIcon size={18} />
            <span className="font-semibold text-sm">Manage Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'system'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <SettingsIcon size={18} />
            <span className="font-semibold text-sm">System Options</span>
          </button>
        </div>

        {/* Setting Panel Content */}
        <div className="flex-1 glass rounded-2xl p-6 transition-all">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <h3 className="text-lg font-bold text-text-primary border-b border-border pb-4">Profile Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50"
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50"
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Email Address</label>
                  <input
                    type="email"
                    disabled
                    className="w-full bg-surface/50 border border-border rounded-xl py-2.5 px-4 text-text-muted focus:outline-none cursor-not-allowed"
                    value={email}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Phone</label>
                  <input
                    type="text"
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Address</label>
                  <input
                    type="text"
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-text-primary border-b border-border pb-4 mb-6">Theme Color</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {themesList.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                        theme === t.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-surface hover:bg-card'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full mb-3 ${t.color}`} />
                      <span className="font-semibold text-sm text-text-primary">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-primary border-b border-border pb-4 mb-6">Appearance Mode</h3>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    onClick={() => setMode('light')}
                    className={`flex items-center justify-center space-x-3 p-4 rounded-xl border transition-all ${
                      mode === 'light' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border bg-surface hover:bg-card text-text-muted'
                    }`}
                  >
                    <Sun size={20} />
                    <span className="font-semibold text-sm">Light Mode</span>
                  </button>
                  
                  <button
                    onClick={() => setMode('dark')}
                    className={`flex items-center justify-center space-x-3 p-4 rounded-xl border transition-all ${
                      mode === 'dark' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border bg-surface hover:bg-card text-text-muted'
                    }`}
                  >
                    <Moon size={20} />
                    <span className="font-semibold text-sm">Dark Mode</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-text-primary border-b border-border pb-4">Manage Transaction Categories</h3>
              
              {/* Form to add Category */}
              <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 p-4 border border-border rounded-xl bg-surface">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Category Name (e.g. Food, Utility Bills)"
                    required
                    className="w-full bg-card border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    className="bg-card border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-surface text-sm h-full"
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value)}
                  >
                    <option value="expense">Expense Category</option>
                    <option value="income">Income Category</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm flex items-center justify-center"
                >
                  <Plus size={16} className="mr-1" /> Add
                </button>
              </form>

              {/* Categories list */}
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center px-4 py-3 rounded-xl border border-border hover:bg-surface transition-colors">
                    <div>
                      <span className="font-semibold text-text-primary text-sm">{cat.name}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-bold ml-3 px-2 py-0.5 rounded-md ${
                        cat.type === 'expense' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10' : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/10'
                      }`}>
                        {cat.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-surface transition-colors animate-fade-out"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-text-primary border-b border-border pb-4">System Defaults</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Default Currency</label>
                  <select
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-surface"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="PHP">PHP (₱)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Timezone</label>
                  <select
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-surface"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Manila">Manila (UTC+8)</option>
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="Europe/London">London (UTC+0)</option>
                  </select>
                </div>
              </div>
              <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-sm">
                Save Options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
