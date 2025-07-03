import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload, QrCode, CreditCard, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PaymentModalProps {
  children: React.ReactNode;
}

interface PaymentSettings {
  payment_amount: string;
  qr_code_url: string;
}

interface CouponValidation {
  isValid: boolean;
  discount: number;
  discountType: 'flat' | 'percentage';
  code: string;
  message: string;
}

export function PaymentModal({ children }: PaymentModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({ payment_amount: '999', qr_code_url: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    utrReference: '',
    couponCode: '',
    paymentProof: null as File | null,
  });
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [showCouponField, setShowCouponField] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPaymentSettings();
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email! }));
      }
    }
  }, [open, user]);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('key, value')
        .in('key', ['payment_amount', 'qr_code_url']);

      if (error) throw error;

      const settingsObj = data.reduce((acc, item) => ({
        ...acc,
        [item.key]: item.value
      }), {} as PaymentSettings);

      setSettings(settingsObj);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    }
  };

  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponValidation(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponValidation({
          isValid: false,
          discount: 0,
          discountType: 'flat' as const,
          code,
          message: 'Invalid or expired coupon code'
        });
        return;
      }

      // Check expiry
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        setCouponValidation({
          isValid: false,
          discount: 0,
          discountType: 'flat',
          code,
          message: 'Coupon has expired'
        });
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setCouponValidation({
          isValid: false,
          discount: 0,
          discountType: 'flat',
          code,
          message: 'Coupon usage limit reached'
        });
        return;
      }

      setCouponValidation({
        isValid: true,
        discount: data.discount_value,
        discountType: data.discount_type as 'flat' | 'percentage',
        code: data.code,
        message: `${data.discount_type === 'flat' ? `₹${data.discount_value}` : `${data.discount_value}%`} discount applied`
      });
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponValidation({
        isValid: false,
        discount: 0,
        discountType: 'flat',
        code,
        message: 'Error validating coupon'
      });
    }
  };

  const calculateFinalAmount = () => {
    const baseAmount = parseFloat(settings.payment_amount);
    if (!couponValidation?.isValid) return baseAmount;

    if (couponValidation.discountType === 'flat') {
      return Math.max(0, baseAmount - couponValidation.discount);
    } else {
      return Math.max(0, baseAmount - (baseAmount * couponValidation.discount / 100));
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileName = `payment-proof-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('community-uploads')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('community-uploads')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit payment');
      return;
    }

    setLoading(true);
    try {
      let paymentProofUrl = null;
      
      if (formData.paymentProof) {
        paymentProofUrl = await handleFileUpload(formData.paymentProof);
      }

      const baseAmount = parseFloat(settings.payment_amount);
      const finalAmount = calculateFinalAmount();
      const discountAmount = baseAmount - finalAmount;

      const { error } = await supabase
        .from('payment_submissions')
        .insert({
          user_id: user.id,
          user_name: formData.name,
          user_email: formData.email,
          utr_reference: formData.utrReference,
          payment_proof_url: paymentProofUrl,
          payment_amount: baseAmount,
          coupon_code: couponValidation?.isValid ? couponValidation.code : null,
          discount_amount: discountAmount,
          final_amount: finalAmount,
        });

      if (error) throw error;

      // Send email notification
      await supabase.functions.invoke('send-payment-notification', {
        body: {
          userName: formData.name,
          userEmail: formData.email,
          utrReference: formData.utrReference,
          paymentAmount: baseAmount,
          finalAmount,
          couponCode: couponValidation?.isValid ? couponValidation.code : null,
          discountAmount: discountAmount,
          paymentProofUrl,
          submissionTime: new Date().toLocaleString(),
        },
      });

      toast.success('Payment submission sent! Admin will verify and grant access.');
      setOpen(false);
      setFormData({
        name: '',
        email: user.email || '',
        utrReference: '',
        couponCode: '',
        paymentProof: null,
      });
      setCouponValidation(null);
      setShowCouponField(false);
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      toast.error('Failed to submit payment: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const finalAmount = calculateFinalAmount();
  const hasDiscount = couponValidation?.isValid && finalAmount < parseFloat(settings.payment_amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CreditCard className="w-5 h-5" />
            Subscribe to Community Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Section */}
          <Card className="border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Scan QR Code to Pay</h3>
              </div>
              {settings.qr_code_url && (
                <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
                  <img 
                    src={settings.qr_code_url} 
                    alt="Payment QR Code - SwingScribe" 
                    className="w-64 h-64 border border-gray-300 rounded-lg shadow-lg"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {hasDiscount && (
                    <span className="text-muted-foreground line-through">₹{settings.payment_amount}</span>
                  )}
                  <span className="text-2xl font-bold text-primary">₹{finalAmount}</span>
                </div>
                {hasDiscount && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                    You saved ₹{parseFloat(settings.payment_amount) - finalAmount}!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                  className="bg-background border-primary/20 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                  className="bg-background border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utr">UTR/Transaction Reference ID *</Label>
              <Input
                id="utr"
                value={formData.utrReference}
                onChange={(e) => setFormData(prev => ({ ...prev, utrReference: e.target.value }))}
                placeholder="Enter UTR or Transaction ID from your payment app"
                required
                className="bg-background border-primary/20 focus:border-primary"
              />
            </div>

            {/* Coupon Section */}
            <div className="space-y-3">
              {!showCouponField ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCouponField(true)}
                  className="w-full border-primary/20 hover:bg-primary/5"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Have a coupon code?
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="coupon">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={formData.couponCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setFormData(prev => ({ ...prev, couponCode: value }));
                        validateCoupon(value);
                      }}
                      placeholder="Enter coupon code"
                      className="bg-background border-primary/20 focus:border-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCouponField(false);
                        setFormData(prev => ({ ...prev, couponCode: '' }));
                        setCouponValidation(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  {couponValidation && (
                    <div className={`flex items-center gap-2 text-sm ${
                      couponValidation.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {couponValidation.isValid ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {couponValidation.message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="proof">Payment Screenshot (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    paymentProof: e.target.files?.[0] || null 
                  }))}
                  className="bg-background border-primary/20 focus:border-primary"
                />
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Submitting...' : 'Submit Payment Details'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}