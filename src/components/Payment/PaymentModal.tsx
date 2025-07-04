
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, CreditCard, Copy, CheckCircle, Tag, Percent, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PaymentModalProps {
  children: React.ReactNode;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
}

export function PaymentModal({ children }: PaymentModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'payment' | 'upload'>('payment');
  const [formData, setFormData] = useState({
    fullName: '',
    utrReference: '',
    couponCode: '',
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(999);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [finalAmount, setFinalAmount] = useState(999);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchPaymentSettings();
      if (user) {
        setFormData(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || user.email || ''
        }));
      }
    }
  }, [isOpen, user]);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('key, value')
        .in('key', ['payment_amount', 'qr_code_url']);

      if (error) throw error;

      const settings = data.reduce((acc, item) => ({
        ...acc,
        [item.key]: item.value
      }), {} as Record<string, string>);

      const amount = parseFloat(settings.payment_amount || '999');
      setPaymentAmount(amount);
      setFinalAmount(amount);
      setQrCodeUrl(settings.qr_code_url || '/lovable-uploads/25f34618-a2c2-4386-a490-72a69fa89c8b.png');
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    }
  };

  const formatIndianRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const applyCoupon = async () => {
    if (!formData.couponCode.trim()) return;

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', formData.couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error('Invalid or expired coupon code');
        return;
      }

      const coupon = data as Coupon;

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        toast.error('Coupon usage limit exceeded');
        return;
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'flat') {
        discount = Math.min(coupon.discount_value, paymentAmount);
      } else {
        discount = Math.round((paymentAmount * coupon.discount_value) / 100);
      }

      const newFinalAmount = Math.max(0, paymentAmount - discount);

      setAppliedCoupon(coupon);
      setDiscountAmount(discount);
      setFinalAmount(newFinalAmount);
      
      toast.success(`Coupon applied! You saved ${formatIndianRupee(discount)}`);
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to apply coupon');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalAmount(paymentAmount);
    setFormData(prev => ({ ...prev, couponCode: '' }));
    toast.success('Coupon removed');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    
    setPaymentProof(file);
  };

  const uploadProofImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('community-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('community-uploads')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      return null;
    }
  };

  const submitPayment = async () => {
    if (!user) {
      toast.error('Please login to submit payment');
      return;
    }

    if (!formData.fullName.trim() || !formData.utrReference.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let proofUrl = null;
      
      if (paymentProof) {
        proofUrl = await uploadProofImage(paymentProof);
        if (!proofUrl) {
          toast.error('Failed to upload payment proof');
          setLoading(false);
          return;
        }
      }

      const submissionData = {
        user_id: user.id,
        user_name: formData.fullName.trim(),
        user_email: user.email || '',
        utr_reference: formData.utrReference.trim(),
        payment_proof_url: proofUrl,
        payment_amount: paymentAmount,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('payment_submissions')
        .insert(submissionData);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Send payment notification
      try {
        await supabase.functions.invoke('send-payment-notification', {
          body: {
            userName: formData.fullName.trim(),
            userEmail: user.email || '',
            utrReference: formData.utrReference.trim(),
            paymentAmount: paymentAmount,
            finalAmount: finalAmount,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            discountAmount: discountAmount,
            paymentProofUrl: proofUrl,
            submissionTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
          }
        });
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the submission if notification fails
      }

      toast.success('Payment submitted successfully! We will verify it shortly.');
      
      // Reset form
      setFormData({ fullName: '', utrReference: '', couponCode: '' });
      setPaymentProof(null);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setFinalAmount(paymentAmount);
      setStep('payment');
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Failed to submit payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black border-2 border-blue-600">
        <DialogHeader>
          <DialogTitle className="text-2xl text-blue-400 flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Community Access Payment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-2">
          {step === 'payment' && (
            <>
              {/* Payment Details */}
              <Card className="bg-gray-900 border-blue-400/30">
                <CardHeader>
                  <CardTitle className="text-blue-400 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-white">
                    <div>
                      <span className="text-gray-400">Original Amount:</span>
                      <p className="text-xl font-bold">{formatIndianRupee(paymentAmount)}</p>
                    </div>
                    {appliedCoupon && (
                      <div>
                        <span className="text-gray-400">Discount:</span>
                        <p className="text-xl font-bold text-green-400">-{formatIndianRupee(discountAmount)}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-lg">Final Amount:</span>
                      <span className="text-2xl font-bold text-blue-400">{formatIndianRupee(finalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coupon Section */}
              <Card className="bg-gray-900 border-blue-400/30">
                <CardHeader>
                  <CardTitle className="text-blue-400 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Coupon Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code (optional)"
                        value={formData.couponCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                      <Button onClick={applyCoupon} variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black">
                        Apply
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-900/30 border border-green-400/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-green-400 text-green-400">
                          {appliedCoupon.code}
                        </Badge>
                        <span className="text-green-400">
                          {appliedCoupon.discount_type === 'flat' 
                            ? formatIndianRupee(appliedCoupon.discount_value)
                            : `${appliedCoupon.discount_value}%`} off
                        </span>
                      </div>
                      <Button onClick={removeCoupon} variant="ghost" size="sm" className="text-red-400 hover:bg-red-400 hover:text-black">
                        Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card className="bg-gray-900 border-blue-400/30">
                <CardHeader>
                  <CardTitle className="text-blue-400">Payment QR Code</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <img 
                      src={qrCodeUrl} 
                      alt="Payment QR Code" 
                      className="w-48 h-48 object-contain"
                      onError={(e) => {
                        console.error('QR Code failed to load:', qrCodeUrl);
                        // Fallback to default QR code
                        (e.target as HTMLImageElement).src = '/lovable-uploads/25f34618-a2c2-4386-a490-72a69fa89c8b.png';
                      }}
                    />
                  </div>
                  <p className="text-gray-300 mb-4">
                    Scan this QR code with your UPI app to pay {formatIndianRupee(finalAmount)}
                  </p>
                  <Button 
                    onClick={() => copyToClipboard('adityabarod807@paytm')}
                    variant="outline"
                    className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy UPI ID: adityabarod807@paytm
                  </Button>
                </CardContent>
              </Card>

              <Button 
                onClick={() => setStep('upload')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3"
              >
                Next: Upload Payment Proof
              </Button>
            </>
          )}

          {step === 'upload' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Full Name *</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">UTR/Transaction Reference *</Label>
                  <Input
                    value={formData.utrReference}
                    onChange={(e) => setFormData(prev => ({ ...prev, utrReference: e.target.value }))}
                    placeholder="Enter UTR or transaction reference"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Payment Proof (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="payment-proof"
                    />
                    <label
                      htmlFor="payment-proof"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-gray-400">
                        {paymentProof ? paymentProof.name : 'Click to upload payment screenshot'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setStep('payment')}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={submitPayment}
                    disabled={loading || !formData.fullName.trim() || !formData.utrReference.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
