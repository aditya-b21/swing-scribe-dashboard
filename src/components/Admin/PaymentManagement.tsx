import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, QrCode, Check, X, Eye, RefreshCw, Settings, Plus, Edit, Trash2 } from 'lucide-react';
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
  
  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'flat' as 'flat' | 'percentage',
    discount_value: '',
    expiry_date: '',
    usage_limit: '',
  });
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
    fetchCoupons();
    fetchSettings();
  }, []);

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

  return (
    <div className="space-y-6 fade-in">
      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-primary/20">
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Submissions
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Payment Submissions Tab */}
        <TabsContent value="submissions">
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary">Payment Submissions</CardTitle>
                  <CardDescription>Manage and verify user payment submissions</CardDescription>
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
                              <p>₹{submission.final_amount}</p>
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
            {/* Create/Edit Coupon Form */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Coupon Code</Label>
                    <Input
                      value={couponForm.code}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="DISCOUNT10"
                      className="border-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select
                      value={couponForm.discount_type}
                      onValueChange={(value: 'flat' | 'percentage') => 
                        setCouponForm(prev => ({ ...prev, discount_type: value }))
                      }
                    >
                      <SelectTrigger className="border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, discount_value: e.target.value }))}
                      placeholder={couponForm.discount_type === 'flat' ? '100' : '10'}
                      className="border-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usage Limit (Optional)</Label>
                    <Input
                      type="number"
                      value={couponForm.usage_limit}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                      placeholder="Unlimited"
                      className="border-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={couponForm.expiry_date}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                      className="border-primary/20"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={saveCoupon} disabled={loading} className="bg-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    {editingCoupon ? 'Update' : 'Create'} Coupon
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

            {/* Coupons List */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Existing Coupons</CardTitle>
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
                              {coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`} discount
                              {coupon.usage_limit && ` • ${coupon.usage_count}/${coupon.usage_limit} used`}
                              {coupon.expiry_date && ` • Expires: ${new Date(coupon.expiry_date).toLocaleDateString()}`}
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
              <CardDescription>Configure payment amount and QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={settings.payment_amount}
                    onChange={(e) => setSettings(prev => ({ ...prev, payment_amount: e.target.value }))}
                    className="border-primary/20"
                  />
                  <Button
                    onClick={() => updateSettings('payment_amount', settings.payment_amount)}
                    disabled={loading}
                  >
                    Update
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>QR Code URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.qr_code_url}
                    onChange={(e) => setSettings(prev => ({ ...prev, qr_code_url: e.target.value }))}
                    placeholder="/path/to/qr-code.png"
                    className="border-primary/20"
                  />
                  <Button
                    onClick={() => updateSettings('qr_code_url', settings.qr_code_url)}
                    disabled={loading}
                  >
                    Update
                  </Button>
                </div>
              </div>
              {settings.qr_code_url && (
                <div className="mt-4">
                  <Label>QR Code Preview</Label>
                  <div className="mt-2 p-4 border border-primary/20 rounded-lg inline-block">
                    <img 
                      src={settings.qr_code_url} 
                      alt="Payment QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}
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
                <Label>Reason for rejection (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="border-primary/20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => updateSubmissionStatus(selectedSubmission.id, 'rejected', adminNotes)}
                  disabled={loading}
                >
                  Reject Payment
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