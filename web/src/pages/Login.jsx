import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Landmark } from 'lucide-react';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Sign up
        const { data, error } = await signUp(email, password, { first_name: fname, last_name: lname });
        if (error) throw error;
        
        if (data?.user) {
          // Initialize profile explicitly (assuming RLS allows insert or handled via trigger)
          await supabase.from('profiles').insert([
            { id: data.user.id, first_name: fname, last_name: lname }
          ]);
          alert('Sign up successful! Please check your email for confirmation or login now.');
          setIsRegistering(false);
        }
      } else {
        // Sign in
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-all">
      <div className="w-full max-w-md p-8 glass rounded-2xl space-y-6">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-primary/10 rounded-xl text-primary mb-3">
            <Landmark size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">BudgyTrack Account</h2>
          <p className="text-sm text-text-muted mt-1">
            {isRegistering ? 'Create your budget planner profile' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-500 p-3 rounded-xl text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="Jane"
                  className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Doe"
                  className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-3 rounded-xl font-semibold mt-4 transition-colors shadow-sm text-sm"
          >
            {loading ? 'Please wait...' : isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-text-muted">
          <span>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}
            className="text-primary font-semibold hover:underline"
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
