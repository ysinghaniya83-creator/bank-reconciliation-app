import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { hashPin } from '../../lib/utils';

export default function PinSetup() {
  const { appUser, refreshUser } = useAuth();
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (currentPin.length < 4) {
      setCurrentPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setCurrentPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setCurrentPin('');
    setError('');
  };

  const handleNext = async () => {
    if (currentPin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    if (step === 'enter') {
      setStep('confirm');
    } else {
      // Confirm step
      if (pin !== confirmPin) {
        setError('PINs do not match. Please try again.');
        setStep('enter');
        setPin('');
        setConfirmPin('');
        return;
      }

      // Save PIN
      setLoading(true);
      try {
        const hashed = await hashPin(pin);
        if (!appUser) return;
        await updateDoc(doc(db, 'users', appUser.uid), {
          pinHash: hashed,
          pinSet: true,
        });
        await refreshUser();
      } catch (err) {
        console.error('Error saving PIN:', err);
        setError('Failed to save PIN. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'enter' ? 'Set Your PIN' : 'Confirm Your PIN'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'enter'
              ? 'Create a 4-digit PIN to secure your account'
              : 'Enter your PIN again to confirm'}
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < currentPin.length
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm text-center">
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
                  className="h-14 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-700 text-lg transition-colors"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(digit)}
                className="h-14 bg-gray-100 hover:bg-blue-50 active:bg-blue-100 rounded-xl font-bold text-gray-800 text-xl transition-colors"
              >
                {digit}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleNext}
            disabled={currentPin.length !== 4 || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : step === 'enter' ? 'Next' : 'Set PIN'}
          </button>
          {step === 'confirm' && (
            <button
              onClick={() => {
                setStep('enter');
                setPin('');
                setConfirmPin('');
                setError('');
              }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm"
            >
              Back
            </button>
          )}
          {step === 'enter' && (
            <button
              onClick={handleClear}
              className="w-full text-gray-400 hover:text-gray-600 py-2 text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
