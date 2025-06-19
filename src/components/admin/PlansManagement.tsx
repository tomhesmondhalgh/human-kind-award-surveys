
import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plan, getPlans } from '../../lib/supabase/subscription';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, Save, X } from 'lucide-react';
import { fixPlanTypes } from '../../utils/typeConversions';

const PlansManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // For new plan form
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    name: '',
    description: '',
    price: 0,
    currency: 'GBP',
    purchase_type: 'subscription',
    duration_months: 36,
    stripe_price_id: '',
    features: [],
    is_popular: false,
    is_active: true,
    sort_order: 0
  });

  // For features input in the form
  const [featuresText, setFeaturesText] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const fetchedPlans = await getPlans();
      
      // Also get inactive plans
      const { data: inactivePlans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', false)
        .order('sort_order');
      
      if (error) {
        console.error('Error fetching inactive plans:', error);
      } else if (inactivePlans) {
        // Use our utility function to fix plan types
        const typedInactivePlans = fixPlanTypes(inactivePlans);
        setPlans([...fetchedPlans, ...typedInactivePlans]);
      } else {
        setPlans(fetchedPlans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plans.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setFeaturesText(plan.features.join('\n'));
    setShowDialog(true);
  };

  const handleCreateNewPlan = () => {
    setEditingPlan(null);
    setFeaturesText('');
    setNewPlan({
      name: '',
      description: '',
      price: 0,
      currency: 'GBP',
      purchase_type: 'subscription',
      duration_months: 36,
      stripe_price_id: '',
      features: [],
      is_popular: false,
      is_active: true,
      sort_order: plans.length > 0 ? Math.max(...plans.map(p => p.sort_order)) + 1 : 1
    });
    setShowDialog(true);
  };

  const handleSavePlan = async () => {
    try {
      setIsSaving(true);
      
      // Parse features from textarea into array
      const featuresArray = featuresText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (editingPlan) {
        // Update existing plan - ensure required properties
        const updatedPlan = {
          ...editingPlan,
          name: editingPlan.name || '',
          description: editingPlan.description || '',
          sort_order: editingPlan.sort_order || 0,
          features: featuresArray,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('plans')
          .update(updatedPlan)
          .eq('id', editingPlan.id);
          
        if (error) {
          throw error;
        }
        
        toast({
          title: 'Success',
          description: `Plan "${editingPlan.name}" has been updated.`
        });
      } else {
        // Create new plan - ensure required properties
        const planToCreate = {
          ...newPlan,
          name: newPlan.name || '',
          description: newPlan.description || '',
          sort_order: newPlan.sort_order || 0,
          features: featuresArray,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('plans')
          .insert(planToCreate);
          
        if (error) {
          throw error;
        }
        
        toast({
          title: 'Success',
          description: `New plan "${newPlan.name}" has been created.`
        });
      }
      
      // Refresh plans list
      await fetchPlans();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save plan.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlanStatus = async (plan: Plan) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ 
          is_active: !plan.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Success',
        description: `Plan "${plan.name}" has been ${plan.is_active ? 'deactivated' : 'activated'}.`
      });
      
      // Refresh plans list
      await fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan status.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plans Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plans Management</CardTitle>
        <Button onClick={handleCreateNewPlan}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Plan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {plans.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No plans found. Create your first plan.</p>
          ) : (
            plans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => (
              <div key={plan.id} className={`p-4 border rounded-lg ${!plan.is_active ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.is_popular && (
                      <span className="bg-brandPurple-100 text-brandPurple-800 text-xs px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                    {!plan.is_active && (
                      <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center mr-4">
                      <Label htmlFor={`active-${plan.id}`} className="mr-2">
                        Active
                      </Label>
                      <Switch 
                        id={`active-${plan.id}`}
                        checked={plan.is_active}
                        onCheckedChange={() => handleTogglePlanStatus(plan)}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-gray-500 mb-2">{plan.description}</p>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Price:</span>{' '}
                    <span className="font-semibold">{`${plan.currency} ${(plan.price / 100).toFixed(2)}`}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Type:</span>{' '}
                    <span>{plan.purchase_type || 'N/A'}</span>
                    {plan.duration_months && (
                      <span> ({plan.duration_months} months)</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Stripe Price ID:</span>{' '}
                  <span className="font-mono text-sm">{plan.stripe_price_id || 'Not set'}</span>
                </div>
                <Separator className="my-3" />
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Features:</h4>
                  <ul className="pl-5 list-disc space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-sm">{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update the details of this plan.' : 'Add a new subscription plan to your offerings.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input 
                  id="name" 
                  value={editingPlan ? editingPlan.name : newPlan.name}
                  onChange={(e) => editingPlan 
                    ? setEditingPlan({...editingPlan, name: e.target.value})
                    : setNewPlan({...newPlan, name: e.target.value})
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="sort_order">Display Order</Label>
                <Input 
                  id="sort_order" 
                  type="number"
                  value={editingPlan ? editingPlan.sort_order : newPlan.sort_order}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    editingPlan 
                      ? setEditingPlan({...editingPlan, sort_order: value})
                      : setNewPlan({...newPlan, sort_order: value})
                  }}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={editingPlan ? editingPlan.description : newPlan.description}
                  onChange={(e) => editingPlan 
                    ? setEditingPlan({...editingPlan, description: e.target.value})
                    : setNewPlan({...newPlan, description: e.target.value})
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="price">Price (in pence)</Label>
                <Input 
                  id="price" 
                  type="number"
                  value={editingPlan ? editingPlan.price : newPlan.price}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    editingPlan 
                      ? setEditingPlan({...editingPlan, price: value})
                      : setNewPlan({...newPlan, price: value})
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input 
                  id="currency" 
                  value={editingPlan ? editingPlan.currency : newPlan.currency}
                  onChange={(e) => editingPlan 
                    ? setEditingPlan({...editingPlan, currency: e.target.value})
                    : setNewPlan({...newPlan, currency: e.target.value})
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="purchase_type">Purchase Type</Label>
                <Select 
                  value={editingPlan ? editingPlan.purchase_type : newPlan.purchase_type}
                  onValueChange={(value) => editingPlan 
                    ? setEditingPlan({...editingPlan, purchase_type: value as 'subscription' | 'one-time'})
                    : setNewPlan({...newPlan, purchase_type: value as 'subscription' | 'one-time'})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="one-time">One-time Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="duration_months">Duration (months)</Label>
                <Input 
                  id="duration_months" 
                  type="number"
                  value={editingPlan ? editingPlan.duration_months : newPlan.duration_months}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    editingPlan 
                      ? setEditingPlan({...editingPlan, duration_months: value})
                      : setNewPlan({...newPlan, duration_months: value})
                  }}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
                <Input 
                  id="stripe_price_id" 
                  value={editingPlan ? editingPlan.stripe_price_id : newPlan.stripe_price_id}
                  onChange={(e) => editingPlan 
                    ? setEditingPlan({...editingPlan, stripe_price_id: e.target.value})
                    : setNewPlan({...newPlan, stripe_price_id: e.target.value})
                  }
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_popular"
                  checked={editingPlan ? editingPlan.is_popular : newPlan.is_popular}
                  onCheckedChange={(checked) => editingPlan 
                    ? setEditingPlan({...editingPlan, is_popular: checked})
                    : setNewPlan({...newPlan, is_popular: checked})
                  }
                />
                <Label htmlFor="is_popular">Mark as popular</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_active"
                  checked={editingPlan ? editingPlan.is_active : newPlan.is_active}
                  onCheckedChange={(checked) => editingPlan 
                    ? setEditingPlan({...editingPlan, is_active: checked})
                    : setNewPlan({...newPlan, is_active: checked})
                  }
                />
                <Label htmlFor="is_active">Active plan</Label>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea 
                  id="features" 
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePlan}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PlansManagement;
