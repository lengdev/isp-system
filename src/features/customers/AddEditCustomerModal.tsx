import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ArrowRight, ArrowLeft, User, Wifi, FileCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { ConnectionType, CustomerStatus } from '../../types';

const customerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(8, 'Valid phone number is required'),
  address: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  planId: z.string().min(1, 'Please select an internet plan'),
  connectionType: z.enum(['Fiber', 'Wireless', 'DSL']),
  ipAddress: z.string().min(7, 'Valid IP address required'),
  macAddress: z.string().min(10, 'Valid MAC address required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(['Active', 'Suspended', 'Pending', 'Disconnected', 'Overdue']),
  assignedTechnician: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const AddEditCustomerModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.addEditCustomer);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);
  const plans = useStore((s) => s.plans);
  const technicians = useStore((s) => s.technicians);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);

  const isEdit = Boolean(modalState.customerId);
  const existingCustomer = customers.find((c) => c.id === modalState.customerId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: 'Austin, TX',
      planId: plans[0]?.id || '',
      connectionType: 'Fiber',
      ipAddress: `192.168.${Math.floor(Math.random() * 80) + 10}.${Math.floor(Math.random() * 200) + 10}`,
      macAddress: `F4:5C:89:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:9A`,
      dueDate: '2025-10-15',
      status: 'Active',
      assignedTechnician: technicians[0]?.name || 'Carlos Ramos',
      tags: ['Residential'],
      notes: '',
    },
  });

  const watchedData = watch();

  useEffect(() => {
    if (modalState.isOpen) {
      setStep(1);
      if (isEdit && existingCustomer) {
        reset({
          fullName: existingCustomer.fullName,
          email: existingCustomer.email,
          phone: existingCustomer.phone,
          address: existingCustomer.address,
          city: existingCustomer.city,
          planId: existingCustomer.planId,
          connectionType: existingCustomer.connectionType,
          ipAddress: existingCustomer.ipAddress,
          macAddress: existingCustomer.macAddress,
          dueDate: existingCustomer.dueDate,
          status: existingCustomer.status,
          assignedTechnician: existingCustomer.assignedTechnician || technicians[0]?.name,
          tags: existingCustomer.tags || ['Residential'],
          notes: existingCustomer.notes || '',
        });
      } else {
        reset({
          fullName: '',
          email: '',
          phone: '',
          address: '',
          city: 'Austin, TX',
          planId: plans[0]?.id || '',
          connectionType: 'Fiber',
          ipAddress: `192.168.${Math.floor(Math.random() * 80) + 10}.${Math.floor(Math.random() * 200) + 10}`,
          macAddress: `F4:5C:89:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:9A`,
          dueDate: '2025-10-15',
          status: 'Active',
          assignedTechnician: technicians[0]?.name || 'Carlos Ramos',
          tags: ['Residential'],
          notes: '',
        });
      }
    }
  }, [modalState.isOpen, isEdit, existingCustomer, plans, technicians, reset]);

  // Combobox Options
  const planOptions: ComboboxOption[] = plans.map((p) => ({
    value: p.id,
    label: `${p.name} — $${p.monthlyPrice}/mo`,
    description: `${p.speedMbps} Mbps Down / ${p.uploadMbps} Mbps Up`,
    group: p.type,
  }));

  const connectionTypeOptions: ComboboxOption[] = [
    { value: 'Fiber', label: 'Fiber Optic (GPON/XGS-PON)' },
    { value: 'Wireless', label: 'Fixed Wireless (PtMP)' },
    { value: 'DSL', label: 'DSL Copper' },
  ];

  const statusOptions: ComboboxOption[] = [
    { value: 'Active', label: 'Active (Provisioned & Connected)' },
    { value: 'Pending', label: 'Pending Installation' },
    { value: 'Suspended', label: 'Suspended (Hold)' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Disconnected', label: 'Disconnected' },
  ];

  const cityOptions: ComboboxOption[] = [
    { value: 'Austin, TX', label: 'Austin, TX' },
    { value: 'Seattle, WA', label: 'Seattle, WA' },
    { value: 'Denver, CO', label: 'Denver, CO' },
    { value: 'Portland, OR', label: 'Portland, OR' },
    { value: 'San Jose, CA', label: 'San Jose, CA' },
    { value: 'Phoenix, AZ', label: 'Phoenix, AZ' },
  ];

  const technicianOptions: ComboboxOption[] = technicians.map((t) => ({
    value: t.name,
    label: t.name,
    description: `${t.zone} (${t.status})`,
  }));

  const tagOptions: ComboboxOption[] = [
    { value: 'Residential', label: 'Residential' },
    { value: 'Business', label: 'Business / Enterprise' },
    { value: 'VIP', label: 'VIP Priority' },
    { value: 'Static IP', label: 'Static IP Requested' },
  ];

  const handleNextStep = async () => {
    if (step === 1) {
      const valid = await trigger(['fullName', 'email', 'phone', 'address', 'city']);
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await trigger([
        'planId',
        'connectionType',
        'ipAddress',
        'macAddress',
        'dueDate',
        'status',
      ]);
      if (valid) setStep(3);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    const chosenPlan = plans.find((p) => p.id === data.planId) || plans[0];

    const customerPayload = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      planId: chosenPlan.id,
      planName: chosenPlan.name,
      monthlyPrice: chosenPlan.monthlyPrice,
      connectionType: data.connectionType,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      installationDate: new Date().toISOString().split('T')[0],
      dueDate: data.dueDate,
      dataUsageGB: isEdit && existingCustomer ? existingCustomer.dataUsageGB : 12,
      dataCapGB: chosenPlan.dataCapGB,
      balanceDue: isEdit && existingCustomer ? existingCustomer.balanceDue : 0,
      status: data.status,
      rating: isEdit && existingCustomer ? existingCustomer.rating : 5.0,
      assignedTechnician: data.assignedTechnician,
      tags: data.tags,
      notes: data.notes,
      onlineStatus: 'online' as const,
      lastPingMs: 14,
      initials: data.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    };

    if (isEdit && existingCustomer) {
      await updateCustomer(existingCustomer.id, customerPayload);
    } else {
      await addCustomer(customerPayload);
    }

    setIsSubmitting(false);
    closeModal('addEditCustomer');
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('addEditCustomer')}
      title={isEdit ? 'Edit Subscriber Account' : 'Add New Customer'}
      subtitle={
        isEdit
          ? `Updating profile for ${existingCustomer?.fullName}`
          : 'Step-by-step subscriber onboarding'
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-gray-200 dark:bg-gray-800 -z-0" />
          {[
            { num: 1, label: 'Personal Info', icon: User },
            { num: 2, label: 'Plan & Network', icon: Wifi },
            { num: 3, label: 'Review & Confirm', icon: FileCheck },
          ].map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[#F26B3A] text-white shadow-xs'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    isCurrent ? 'text-[#F26B3A]' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Multi-step Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AnimatePresence mode="wait">
            {/* STEP 1: PERSONAL INFO */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Full Name *
                  </label>
                  <input
                    {...register('fullName')}
                    placeholder="e.g. Rachel Adams"
                    className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
                  />
                  {errors.fullName && (
                    <span className="text-red-500 text-[11px] mt-1 block">
                      {errors.fullName.message}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Email Address *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="rachel@example.com"
                      className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
                    />
                    {errors.email && (
                      <span className="text-red-500 text-[11px] mt-1 block">
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      {...register('phone')}
                      placeholder="+1 (512) 555-0199"
                      className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
                    />
                    {errors.phone && (
                      <span className="text-red-500 text-[11px] mt-1 block">
                        {errors.phone.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Street Address *
                    </label>
                    <input
                      {...register('address')}
                      placeholder="742 Evergreen Terrace"
                      className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
                    />
                    {errors.address && (
                      <span className="text-red-500 text-[11px] mt-1 block">
                        {errors.address.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      City (Creatable) *
                    </label>
                    <Controller
                      name="city"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={cityOptions}
                          value={field.value}
                          onChange={field.onChange}
                          creatable={true}
                          placeholder="Select or type city..."
                          size="lg"
                        />
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PLAN & NETWORK (Comboboxes with Grouping) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Select Internet Plan (Grouped by Type) *
                  </label>
                  <Controller
                    name="planId"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={planOptions}
                        value={field.value}
                        onChange={field.onChange}
                        groupBy={true}
                        placeholder="Choose plan..."
                        size="lg"
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Connection Medium
                    </label>
                    <Controller
                      name="connectionType"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={connectionTypeOptions}
                          value={field.value}
                          onChange={field.onChange}
                          searchable={false}
                          clearable={false}
                          size="lg"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Initial Status
                    </label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={statusOptions}
                          value={field.value}
                          onChange={field.onChange}
                          searchable={false}
                          clearable={false}
                          size="lg"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Assigned Field Engineer
                    </label>
                    <Controller
                      name="assignedTechnician"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={technicianOptions}
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Select technician..."
                          size="lg"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Tags & Classification (Multi)
                    </label>
                    <Controller
                      name="tags"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={tagOptions}
                          value={field.value || []}
                          onChange={field.onChange}
                          multiple={true}
                          creatable={true}
                          placeholder="Tags..."
                          size="lg"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      IP Address Assignment *
                    </label>
                    <input
                      {...register('ipAddress')}
                      placeholder="192.168.10.55"
                      className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      ONT / CPE MAC Address *
                    </label>
                    <input
                      {...register('macAddress')}
                      placeholder="F4:5C:89:12:44:8B"
                      className="w-full h-10 px-3 rounded-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181B] font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]/30 focus:border-[#F26B3A]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: REVIEW & CONFIRM */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3.5 text-xs"
              >
                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-[#F26B3A]/30 space-y-2.5">
                  <h4 className="text-xs font-bold text-[#F26B3A] uppercase tracking-wider">
                    Subscription Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Subscriber:</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {watchedData.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Plan:</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {plans.find((p) => p.id === watchedData.planId)?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Assigned IP:</span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {watchedData.ipAddress}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Initial Status:</span>
                      <span className="font-semibold text-emerald-600">{watchedData.status}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400 block text-[11px]">Service Address:</span>
                      <span className="text-gray-800 dark:text-gray-200">
                        {watchedData.address}, {watchedData.city}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 text-center">
                  Clicking confirm will provision this subscriber in NetPulse and assign network routes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="h-9 px-3.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => closeModal('addEditCustomer')}
                className="h-9 px-3.5"
              >
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                className="h-9 px-4 font-semibold"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className="h-9 px-4 font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEdit ? 'Save Changes' : 'Confirm & Provision'}</span>
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};
