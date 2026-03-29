import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePin } from '../../contexts/PinContext';
import { hashPin } from '../../lib/utils';

const MAX_ATTEMPTS = 5;

export default function PinLock() {
  const { appUser, signOut } = useAuth();
  const { unlock } = usePin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      // Auto-verify when 4 digits entered
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = async (enteredPin: string) => {
    if (!appUser?.pinHash) return;
    setLoading(true);

    try {
      const hashed = await hashPin(enteredPin);
      if (hashed === appUser.pinHash) {
        setPin('');
        setAttempts(0);
        unlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');

        if (newAttempts >= MAX_ATTEMPTS) {
          setError('Too many wrong attempts. Signing out...');
          setTimeout(() => {
            signOut();
          }, 2000);
        } else {
          setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`);
        }
      }
    } catch (err) {
      console.error('PIN verification error:', err);
      setError('Verification failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Header */}
        <div className="text-center mb-6">
          {appUser?.photoURL ? (
            <img
              src={appUser.photoURL}
              alt={appUser.displayName}
              className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <h2 className="text-lg font-bold text-gray-900">{appUser?.displayName || 'User'}</h2>
          <p className="text-gray-500 text-sm mt-0.5">Enter PIN to unlock</p>
        </div>

        {/* Attempt warning */}
        {attempts > 0 && attempts < MAX_ATTEMPTS && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-center">
            <p className="text-amber-700 text-xs font-medium">
              {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining before lockout
            </p>
          </div>
        )}

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300'
              } ${loading && i < pin.length ? 'animate-pulse' : ''}`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className={`px-4 py-2 rounded-lg mb-4 text-sm text-center ${
            attempts >= MAX_ATTEMPTS
              ? 'bg-red-100 border border-red-300 text-red-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* PIN Pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {digits.map((digit, i) => {
            if (digit === '') return <div key={i} />;
            if (digit === '⌫') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  disabled={loading || attempts >= MAX_ATTEMPTS}
                  className="h-14 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-700 text-lg transition-colors disabled:opacity-50"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(digit)}
                disabled={loading || attempts >= MAX_ATTEMPTS || pin.length >= 4}
                className="h-14 bg-gray-100 hover:bg-blue-50 active:bg-blue-100 rounded-xl font-bold text-gray-800 text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {digit}
              </button>
            );
          })}
        </div>

        {/* Sign out option */}
        <button
          onClick={signOut}
          className="w-full text-gray-400 hover:text-red-500 py-2 text-sm transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
