import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, QrCode, Check, X, Eye, RefreshCw, Settings, Plus, Edit, Trash2, Upload, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentSubmission {
  id: string;
  user_name: string;
  user_email: string;
  utr_reference: string;
  payment_proof_url?: string;
  payment_amount: number;
  coupon_code?: string;
  discount_amount: number;
  final_amount: number;
  status: 'pending' | 'verified' | 'rejected';
  admin_notes?: string;
  created_at: string;
  verified_at?: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  expiry_date?: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

interface PaymentSettings {
  payment_amount: string;
  qr_code_url: string;
}

export function PaymentManagement() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>({ payment_amount: '999', qr_code_url: '' });
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'flat' as 'flat' | 'percentage',
    discount_value: '',
    expiry_date: '',
    usage_limit: '',
  });
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);

  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
    fetchCoupons();
    fetchSettings();
  }, []);

  const formatIndianRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as PaymentSubmission[]);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to fetch payment submissions');
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    }
  };

  const fetchSettings = async () => {
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
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    }
  };

  const updateSubmissionStatus = async (id: string, status: 'verified' | 'rejected', notes?: string) => {
    try {
      setLoading(true);
      const updateData: any = { 
        status, 
        admin_notes: notes || null,
      };
      
      if (status === 'verified') {
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payment_submissions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success(`Payment ${status} successfully`);
      fetchSubmissions();
      setSelectedSubmission(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update payment status');
    } finally {
      setLoading(false);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment submission? This will revoke the user\'s community access and they will need to pay again.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('payment_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Payment submission deleted successfully. User will need to pay again for community access.');
      fetchSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete payment submission');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key: string, value: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('payment_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Settings updated successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const saveCoupon = async () => {
    try {
      setLoading(true);
      const couponData = {
        code: couponForm.code.toUpperCase(),
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        expiry_date: couponForm.expiry_date || null,
        usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit) : null,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon);
        if (error) throw error;
        toast.success('Coupon updated successfully');
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert(couponData);
        if (error) throw error;
        toast.success('Coupon created successfully');
      }

      setCouponForm({
        code: '',
        discount_type: 'flat',
        discount_value: '',
        expiry_date: '',
        usage_limit: '',
      });
      setEditingCoupon(null);
      fetchCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    } finally {
      setLoading(false);
    }
  };

  const toggleCouponStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Coupon ${!isActive ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast.error('Failed to update coupon status');
    }
  };

  const handleQrCodeSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    
    setQrCodeFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setQrCodePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadQrCode = async (): Promise<string | null> => {
    if (!qrCodeFile) return null;

    try {
      console.log('Starting QR code upload...');
      
      const fileExt = qrCodeFile.name.split('.').pop() || 'jpg';
      const fileName = `qr-code-${Date.now()}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('community-uploads')
        .upload(filePath, qrCodeFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('community-uploads')
        .getPublicUrl(filePath);

      console.log('QR Code uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading QR code:', error);
      toast.error('Failed to upload QR code. Please try again.');
      return null;
    }
  };

  const updateQrCodeSetting = async () => {
    try {
      setLoading(true);
      let qrCodeUrl = settings.qr_code_url;

      if (qrCodeFile) {
        const uploadedUrl = await uploadQrCode();
        if (!uploadedUrl) {
          setLoading(false);
          return;
        }
        qrCodeUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('payment_settings')
        .upsert({ key: 'qr_code_url', value: qrCodeUrl }, { onConflict: 'key' });

      if (error) throw error;

      toast.success('QR Code updated successfully');
      setQrCodeFile(null);
      setQrCodePreview(null);
      fetchSettings();
    } catch (error) {
      console.error('Error updating QR code:', error);
      toast.error('Failed to update QR code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-primary/20">
          <TabsTrigger value="submissions">Payments</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Payment Submissions Tab */}
        <TabsContent value="submissions">
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary">Payment Submissions</CardTitle>
                  <CardDescription>Manage payment submissions</CardDescription>
                </div>
                <Button onClick={fetchSubmissions} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <Card key={submission.id} className="border-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{submission.user_name}</p>
                              <p className="text-sm text-muted-foreground">{submission.user_email}</p>
                            </div>
                            <Badge 
                              variant={
                                submission.status === 'verified' ? 'default' :
                                submission.status === 'rejected' ? 'destructive' : 'secondary'
                              }
                            >
                              {submission.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">UTR:</span>
                              <p className="font-mono">{submission.utr_reference}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Amount:</span>
                              <p>{formatIndianRupee(submission.final_amount)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Coupon:</span>
                              <p>{submission.coupon_code || 'None'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <p>{new Date(submission.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {submission.payment_proof_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(submission.payment_proof_url, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {submission.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateSubmissionStatus(submission.id, 'verified')}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedSubmission(submission);
                                  setAdminNotes('');
                                }}
                                disabled={loading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSubmission(submission.id)}
                            disabled={loading}
                            title="Delete submission (user will need to pay again)"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <div className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">
                  {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={couponForm.code}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="SAVE20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={couponForm.discount_type}
                      onValueChange={(value: 'flat' | 'percentage') => 
                        setCouponForm(prev => ({ ...prev, discount_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, discount_value: e.target.value }))}
                      placeholder={couponForm.discount_type === 'flat' ? '100' : '10'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usage Limit</Label>
                    <Input
                      type="number"
                      value={couponForm.usage_limit}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={saveCoupon} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingCoupon ? 'Update' : 'Create'}
                  </Button>
                  {editingCoupon && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingCoupon(null);
                        setCouponForm({
                          code: '',
                          discount_type: 'flat',
                          discount_value: '',
                          expiry_date: '',
                          usage_limit: '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Coupons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coupons.map((coupon) => (
                    <Card key={coupon.id} className="border-primary/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold">{coupon.code}</span>
                              <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                                {coupon.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {coupon.discount_type === 'flat' 
                                ? formatIndianRupee(coupon.discount_value)
                                : `${coupon.discount_value}%`} discount
                              {coupon.usage_limit && ` • ${coupon.usage_count}/${coupon.usage_limit} used`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCouponForm({
                                  code: coupon.code,
                                  discount_type: coupon.discount_type,
                                  discount_value: coupon.discount_value.toString(),
                                  expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().slice(0, 16) : '',
                                  usage_limit: coupon.usage_limit?.toString() || '',
                                });
                                setEditingCoupon(coupon.id);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                            >
                              {coupon.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteCoupon(coupon.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Payment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={settings.payment_amount}
                    onChange={(e) => setSettings(prev => ({ ...prev, payment_amount: e.target.value }))}
                    placeholder="999"
                  />
                  <Button
                    onClick={() => updateSettings('payment_amount', settings.payment_amount)}
                    disabled={loading}
                  >
                    Update
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current price: {formatIndianRupee(parseFloat(settings.payment_amount))}
                </p>
              </div>
              
              <div className="space-y-4">
                <Label>QR Code for Payment</Label>
                
                {/* QR Code Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      id="qr-code-input"
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => document.getElementById('qr-code-input')?.click()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {qrCodeFile ? 'Change QR Code' : 'Upload QR Code'}
                    </Button>
                    
                    {qrCodeFile && (
                      <Button
                        onClick={updateQrCodeSetting}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {loading ? 'Updating...' : 'Update QR Code'}
                      </Button>
                    )}
                  </div>

                  {/* QR Code Preview */}
                  {(qrCodePreview || settings.qr_code_url) && (
                    <div className="space-y-2">
                      <Label>{qrCodePreview ? 'New QR Code Preview' : 'Current QR Code'}</Label>
                      <div className="p-4 border border-primary/20 rounded-lg inline-block bg-white">
                        <img 
                          src={qrCodePreview || settings.qr_code_url} 
                          alt="Payment QR Code" 
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                      {qrCodePreview && (
                        <p className="text-sm text-muted-foreground">
                          Click "Update QR Code" to save this new QR code
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-primary/20">
            <CardHeader>
              <CardTitle className="text-red-400">Reject Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter reason..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => updateSubmissionStatus(selectedSubmission.id, 'rejected', adminNotes)}
                  disabled={loading}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSubmission(null);
                    setAdminNotes('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
