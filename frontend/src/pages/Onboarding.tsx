import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Upload, CheckCircle, Clock, ShieldAlert, Camera, Image as ImageIcon, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type Step = 1 | 2 | 3 | 4 | 5;

interface Bank {
  code: string;
  name: string;
}

export const Onboarding: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Determine initial step based on KYC status
  useEffect(() => {
    if (user?.kycStatus === 'verified' || user?.kycStatus === 'pending') {
      navigate('/driver');
    }
  }, [user?.kycStatus, navigate]);

  // Step 1: Identity
  const [idType, setIdType] = useState('NIN');
  const [idNumber, setIdNumber] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  
  // Step 2: Address
  const [documentType, setDocumentType] = useState('Utility Bill');
  const [utilityType, setUtilityType] = useState('Electricity');
  const [addressFile, setAddressFile] = useState<File | null>(null);

  // Step 4: Face
  const [faceFile, setFaceFile] = useState<File | null>(null);

  // Step 3: Bank
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const [kycData, setKycData] = useState<Record<string, any>>({});

  // Fetch banks on mount
  useEffect(() => {
    api.get('/kyc/banks').then(res => {
      setBanks(res.data.banks || []);
    }).catch(() => {});
  }, []);

  const resolveAccount = useCallback(async () => {
    if (!selectedBankCode || accountNumber.length !== 10) return;
    setIsResolving(true);
    try {
      const res = await api.post('/kyc/verify-account', { bankCode: selectedBankCode, accountNumber });
      setAccountName(res.data.account_name || '');
    } catch {
      setAccountName('');
    } finally {
      setIsResolving(false);
    }
  }, [selectedBankCode, accountNumber]);

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBankCode) {
      const timer = setTimeout(resolveAccount, 500);
      return () => clearTimeout(timer);
    }
    setAccountName('');
  }, [accountNumber, selectedBankCode, resolveAccount]);

  const handleNext = async () => {
    setError('');
    if (step < 4) {
      if (step === 1 && idFile) {
        const fileUrl = await fileToBase64(idFile);
        setKycData(prev => ({ ...prev, idType, idNumber, idDocumentUrl: fileUrl }));
        setStep(2);
      } else if (step === 2 && addressFile) {
        const fileUrl = await fileToBase64(addressFile);
        setKycData(prev => ({ ...prev, documentType, utilityType, addressDocumentUrl: fileUrl }));
        setStep(3);
      } else if (step === 3) {
        setKycData(prev => ({ ...prev, bankName, bankCode: selectedBankCode, accountName, accountNumber }));
        setStep(4);
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const faceUrl = faceFile ? await fileToBase64(faceFile) : '';
      await api.post('/kyc/submit', {
        ...kycData,
        bankName,
        bankCode: selectedBankCode,
        accountNumber,
        accountName,
        faceImageUrl: faceUrl,
      });
      updateUser({ kycStatus: 'pending', profilePicture: faceUrl || undefined });
      navigate('/driver');
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      const errorMsg = data?.error || data?.message || '';
      if (status === 413) {
        setError('Upload too large. Please reduce image sizes (max 20MB total).');
      } else if (!err.response) {
        setError('Network error. Please check your connection and try again.');
      } else if (typeof errorMsg === 'object') {
        setError(errorMsg.message || 'An error occurred during submission.');
      } else if (errorMsg) {
        setError(errorMsg);
      } else {
        setError('An error occurred during submission.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);



  return (
    <div className="container min-h-screen flex items-center justify-center py-8 bg-gray-50">
      <Card padding="lg" className="w-full max-w-xl shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-xl font-bold text-gray-900">
              {step === 1 && 'Identity Verification'}
              {step === 2 && 'Proof of Address'}
              {step === 3 && 'Banking Details'}
              {step === 4 && 'Face Verification'}
            </CardTitle>
            <span className="text-sm font-medium text-gray-500">Step {step} of 4</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
              <ShieldAlert size={20} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <p className="text-sm text-gray-600 mb-2">We need to verify your identity to ensure the safety of our platform.</p>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">ID Type</label>
                <select 
                  value={idType} 
                  onChange={e => setIdType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="NIN">National Identity Number (NIN)</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="International Passport">International Passport</option>
                </select>
              </div>

              <Input 
                label={`${idType} Number`}
                placeholder={`Enter your ${idType} number`}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Upload Document</label>
                <label className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition">
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files && setIdFile(e.target.files[0])} />
                  <Upload size={32} className="mb-3 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700 text-center">
                    {idFile ? idFile.name : `Click to upload your ${idType}`}
                  </span>
                  {!idFile && <span className="text-xs text-gray-400 mt-1">JPEG, PNG, or PDF (Max 5MB)</span>}
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <p className="text-sm text-gray-600 mb-2">Provide a recent utility bill to verify your residential address.</p>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Document Type</label>
                <select 
                  value={documentType} 
                  onChange={e => setDocumentType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="Utility Bill">Utility Bill</option>
                  <option value="Bank Statement">Bank Statement</option>
                </select>
              </div>

              {documentType === 'Utility Bill' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Utility Type</label>
                  <select 
                    value={utilityType} 
                    onChange={e => setUtilityType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="Electricity">Electricity</option>
                    <option value="Water">Water</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Upload Proof of Address</label>
                <label className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition">
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files && setAddressFile(e.target.files[0])} />
                  <Upload size={32} className="mb-3 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700 text-center">
                    {addressFile ? addressFile.name : 'Click to upload document'}
                  </span>
                  {!addressFile && <span className="text-xs text-gray-400 mt-1">Must be issued within the last 3 months</span>}
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <p className="text-sm text-gray-600 mb-2">Add your bank account details where your earnings will be paid.</p>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Bank Name</label>
                <select
                  value={selectedBankCode}
                  onChange={e => { setSelectedBankCode(e.target.value); const b = banks.find(b => b.code === e.target.value); setBankName(b?.name || ''); setAccountName(''); }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">-- Select a bank --</option>
                  {banks.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <Input 
                label="Account Number"
                placeholder="e.g. 0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />

              {isResolving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader size={14} className="animate-spin" /> Verifying account...
                </div>
              )}

              {accountName && !isResolving && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-800">
                  {accountName}
                </div>
              )}

              <Input 
                label="Account Name"
                placeholder="e.g. John Doe"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <p className="text-sm text-gray-600 mb-2">Take a clear selfie to match against your identity document.</p>
              
              <div className="flex justify-center gap-4 py-6">
                <label className="flex flex-col items-center p-4 w-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition">
                  <input type="file" className="hidden" accept="image/*" capture="user" onChange={e => e.target.files && setFaceFile(e.target.files[0])} />
                  <Camera size={32} className="text-indigo-500 mb-3" />
                  <span className="text-sm font-medium text-gray-700 text-center">Open Camera</span>
                </label>
                
                <label className="flex flex-col items-center p-4 w-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition">
                  <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && setFaceFile(e.target.files[0])} />
                  <ImageIcon size={32} className="text-indigo-500 mb-3" />
                  <span className="text-sm font-medium text-gray-700 text-center">Choose File</span>
                </label>
              </div>

              {faceFile && (
                <div className="flex flex-col items-center pb-4">
                  <div className="w-40 h-40 bg-gray-100 rounded-full border-4 border-indigo-200 flex items-center justify-center overflow-hidden mb-2 relative">
                    <img src={URL.createObjectURL(faceFile)} alt="Selfie" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Photo Selected</span>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center max-w-xs mx-auto mt-2">
                Ensure you are in a well-lit room and your face is fully visible without glasses or hats.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between pt-6 border-t border-gray-100">
          <Button 
            variant="outline" 
            onClick={handleBack} 
            disabled={isSubmitting || step === 1}
            style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}
          >
            Back
          </Button>
          
          <Button 
            onClick={handleNext} 
            isLoading={isSubmitting}
            disabled={
              (step === 1 && (!idNumber || !idFile)) ||
              (step === 2 && !addressFile) ||
              (step === 3 && (!selectedBankCode || !accountName || accountNumber.length < 10)) ||
              (step === 4 && !faceFile)
            }
            className="px-8"
          >
            {step === 4 ? 'Submit Verification' : 'Continue'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};