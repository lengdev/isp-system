import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ArrowRight, ArrowLeft, User, Wifi, FileCheck, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea, FormSectionTitle } from '../../components/ui/Field';
import { Combobox, ComboboxOption } from '../../components/ui/Combobox';
import { DatePicker } from '../../components/ui/DatePicker';
import { ConnectionType, CustomerStatus } from '../../types';

import { getInitials } from '../../lib/utils';

const customerSchema = z
  .object({
    nameKm: z.string().optional().default(''),
    nameEn: z.string().optional().default(''),
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
  })
  .superRefine((data, ctx) => {
    const km = (data.nameKm || '').trim().normalize('NFC');
    const en = (data.nameEn || '').trim().normalize('NFC');
    if (!km && !en) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter at least a Khmer name or a Latin name',
        path: ['nameEn'],
      });
    }
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
  const addToast = useStore((s) => s.addToast);

  const isEdit = Boolean(modalState.customerId);
  const existingCustomer = customers.find((c) => c.id === modalState.customerId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    trigger,
    formState: { errors, isDirty },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      nameKm: '',
      nameEn: '',
      email: '',
      phone: '',
      address: '',
      city: 'Phnom Penh',
      planId: plans[0]?.id || '',
      connectionType: 'Fiber',
      ipAddress: `192.168.${Math.floor(Math.random() * 80) + 10}.${Math.floor(Math.random() * 200) + 10}`,
      macAddress: `F4:5C:89:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:9A`,
      dueDate: '2025-10-15',
      status: 'Active',
      assignedTechnician: technicians[0]?.name || 'Sok Chea',
      tags: ['Residential'],
      notes: '',
    },
  });

  const watchedData = watch();

  useEffect(() => {
    if (modalState.isOpen) {
      setStep(1);
      setDirection('forward');
      setIsSubmitting(false);
      setIsSuccess(false);

      if (isEdit && existingCustomer) {
        setSelectedTierId((existingCustomer as any).bandwidthTierId || '');
        const hasKm = Boolean(existingCustomer.nameKm?.trim());
        const hasEn = Boolean(existingCustomer.nameEn?.trim());
        const fallbackHasKm = /[\u1780-\u17FF]/.test(existingCustomer.fullName || '');
        reset({
          nameKm: existingCustomer.nameKm || (!hasKm && !hasEn && fallbackHasKm ? existingCustomer.fullName : ''),
          nameEn: existingCustomer.nameEn || (!hasKm && !hasEn && !fallbackHasKm ? existingCustomer.fullName : ''),
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
        const defPlan = plans[0];
        const defTier = defPlan?.bandwidthTiers?.find((t) => t.isDefault) || defPlan?.bandwidthTiers?.[0];
        setSelectedTierId(defTier?.id || '');
        reset({
          nameKm: '',
          nameEn: '',
          email: '',
          phone: '',
          address: '',
          city: 'Phnom Penh',
          planId: plans[0]?.id || '',
          connectionType: 'Fiber',
          ipAddress: `192.168.${Math.floor(Math.random() * 80) + 10}.${Math.floor(Math.random() * 200) + 10}`,
          macAddress: `F4:5C:89:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:9A`,
          dueDate: '2025-10-15',
          status: 'Active',
          assignedTechnician: technicians[0]?.name || 'Sok Chea',
          tags: ['Residential'],
          notes: '',
        });
      }
    }
  }, [modalState.isOpen, isEdit, existingCustomer, plans, technicians, reset]);

  // Clean Combobox Options
  const planOptions: ComboboxOption[] = plans.map((p) => ({
    value: p.id,
    label: `${p.name} ($${p.monthlyPrice}/mo)`,
    description: `${p.speedMbps} Mbps Down • ${p.uploadMbps} Mbps Up • ${p.type}`,
    group: p.type,
  }));

  const connectionTypeOptions: ComboboxOption[] = [
    { value: 'Fiber', label: 'Fiber Optic', description: 'GPON / XGS-PON symmetrical' },
    { value: 'Wireless', label: 'Fixed Wireless', description: 'PtMP high-capacity microwave link' },
    { value: 'DSL', label: 'DSL Copper', description: 'Legacy copper twisted-pair' },
  ];

  const statusOptions: ComboboxOption[] = [
    { value: 'Active', label: 'Active', description: 'Provisioned and traffic passing' },
    { value: 'Pending', label: 'Pending', description: 'Installation scheduled, awaiting ONT' },
    { value: 'Suspended', label: 'Suspended', description: 'Administrative or non-payment hold' },
    { value: 'Overdue', label: 'Overdue', description: 'Past billing cycle due date' },
    { value: 'Disconnected', label: 'Disconnected', description: 'Service terminated' },
  ];

  const cityOptions: ComboboxOption[] = [
    { value: 'Phnom Penh', label: 'Phnom Penh' },
    { value: 'Siem Reap', label: 'Siem Reap' },
    { value: 'Battambang', label: 'Battambang' },
    { value: 'Sihanoukville', label: 'Sihanoukville' },
    { value: 'Kampong Cham', label: 'Kampong Cham' },
    { value: 'Kampot', label: 'Kampot' },
  ];

  const technicianOptions: ComboboxOption[] = technicians.map((t) => ({
    value: t.name,
    label: t.name,
    description: `${t.zone} • ${t.status}`,
  }));

  const tagOptions: ComboboxOption[] = [
    { value: 'Residential', label: 'Residential', description: 'Standard home broadband' },
    { value: 'Business', label: 'Business', description: 'Commercial enterprise SLA' },
    { value: 'VIP', label: 'VIP Priority', description: 'Executive account tier' },
    { value: 'Static IP', label: 'Static IP', description: 'Dedicated public IPv4 routed' },
  ];

  const handleNextStep = async () => {
    if (step === 1) {
      const valid = await trigger(['nameKm', 'nameEn', 'email', 'phone', 'address', 'city']);
      if (valid) {
        setDirection('forward');
        setStep(2);
      }
    } else if (step === 2) {
      const valid = await trigger([
        'planId',
        'connectionType',
        'ipAddress',
        'macAddress',
        'dueDate',
        'status',
      ]);
      if (valid) {
        setDirection('forward');
        setStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    setDirection('backward');
    setStep((s) => (s - 1) as any);
  };

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    const chosenPlan = plans.find((p) => p.id === data.planId) || plans[0];
    const availableTiers = chosenPlan?.bandwidthTiers || [];
    const chosenTier =
      availableTiers.find((t) => t.id === selectedTierId) ||
      availableTiers.find((t) => t.isDefault) ||
      availableTiers[0];
    const monthlyPrice = chosenTier ? Number(chosenTier.price) : chosenPlan.monthlyPrice;
    const dataCapGB = chosenTier?.dataCapGB !== undefined ? chosenTier.dataCapGB : chosenPlan.dataCapGB;

    const nameKm = (data.nameKm || '').trim().normalize('NFC') || null;
    const nameEn = (data.nameEn || '').trim().normalize('NFC') || null;
    const fullName = nameEn || nameKm || '';

    const customerPayload = {
      nameKm,
      nameEn,
      fullName,
      email: data.email.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      planId: chosenPlan.id,
      planName: chosenPlan.name,
      bandwidthTierId: chosenTier?.id || undefined,
      bandwidthTierLabel: chosenTier?.label || undefined,
      monthlyPrice,
      connectionType: data.connectionType,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      installationDate: new Date().toISOString().split('T')[0],
      dueDate: data.dueDate,
      dataUsageGB: isEdit && existingCustomer ? existingCustomer.dataUsageGB : 12,
      dataCapGB,
      balanceDue: isEdit && existingCustomer ? existingCustomer.balanceDue : 0,
      status: data.status,
      rating: isEdit && existingCustomer ? existingCustomer.rating : 5.0,
      assignedTechnician: data.assignedTechnician,
      tags: data.tags,
      notes: data.notes,
      onlineStatus: 'online' as const,
      lastPingMs: 14,
      initials: getInitials(fullName),
    };

    try {
      if (isEdit && existingCustomer) {
        await updateCustomer(existingCustomer.id, customerPayload);
      } else {
        await addCustomer(customerPayload);
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        addToast({
          type: 'success',
          title: isEdit ? 'Customer Updated' : 'Customer Enrolled',
          message: `${fullName} is now provisioned with ${chosenPlan.name}.`,
        });
        closeModal('addEditCustomer');
      }, 600);
    } catch (err: any) {
      setIsSubmitting(false);
      addToast({
        type: 'error',
        title: isEdit ? 'Update Failed' : 'Enrollment Failed',
        message: err?.message || 'Unable to save customer record.',
      });
    }
  };

  const stepVariants = {
    initial: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? 24 : -24,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    exit: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? -24 : 24,
      transition: { duration: 0.15, ease: 'easeIn' },
    }),
  };

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('addEditCustomer')}
      size="xl"
      icon={<User className="w-5 h-5" />}
      iconColor="orange"
      title={isEdit ? 'Edit Subscriber Account' : 'Add New Customer'}
      subtitle={
        isEdit
          ? `Modifying subscriber account profile for ${existingCustomer?.nameKm || existingCustomer?.nameEn || existingCustomer?.fullName}`
          : 'Step-by-step subscriber onboarding and optical provisioning'
      }
      isDirty={isDirty}
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handlePrevStep}
                className="h-10 px-4 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => closeModal('addEditCustomer')}
                className="h-10 px-4"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNextStep}
                className="h-10 px-5 gap-1.5 font-semibold"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="h-10 px-5 gap-1.5 font-semibold"
              >
                {isSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Provisioned!</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEdit ? 'Save Changes' : 'Confirm & Provision'}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div>
        {/* Step Progress Bar (Centered, 32px circles, animated 2px connector, mb-6) */}
        <div className="relative mb-6 select-none max-w-xl mx-auto px-4 sm:px-6">
          {/* Connector Line Background */}
          <div className="absolute top-4 left-8 right-8 sm:left-12 sm:right-12 -translate-y-1/2 h-[2px] bg-gray-200 dark:bg-gray-800 -z-0" />
          {/* Connector Line Animated Orange Progress Fill */}
          <motion.div
            className="absolute top-4 left-8 sm:left-12 -translate-y-1/2 h-[2px] bg-[#F26B3A] -z-0"
            initial={false}
            animate={{
              width:
                step === 1
                  ? '0%'
                  : step === 2
                  ? '50%'
                  : 'calc(100% - 64px)',
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          />

          <div className="flex items-center justify-between relative z-10">
            {[
              { num: 1, label: 'Personal Details' },
              { num: 2, label: 'Plan & Provisioning' },
              { num: 3, label: 'Review & Confirm' },
            ].map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] transition-all duration-200 shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : isCurrent
                        ? 'bg-[#F26B3A] text-white ring-4 ring-[#F26B3A]/20 shadow-xs font-semibold'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 font-medium'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : s.num}
                  </div>
                  <span
                    className={`mt-2 text-center text-[13px] leading-tight select-none ${
                      isCurrent
                        ? 'text-[#F26B3A] font-semibold'
                        : isCompleted
                        ? 'text-gray-700 dark:text-gray-300 font-medium'
                        : 'text-gray-400 dark:text-gray-500 font-normal'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-step Form Content */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 1: PERSONAL DETAILS */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                {/* Bilingual Names */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    <Field label="Khmer name (ឈ្មោះខ្មែរ)" error={errors.nameKm?.message}>
                      <Input
                        {...register('nameKm')}
                        lang="km"
                        placeholder="ឧ. សុខា ចាន់"
                        hasError={Boolean(errors.nameKm || errors.nameEn)}
                      />
                    </Field>

                    <Field label="Latin name" error={errors.nameEn?.message}>
                      <Input
                        {...register('nameEn')}
                        placeholder="e.g. Sokha Chan"
                        hasError={Boolean(errors.nameEn)}
                      />
                    </Field>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Provide a Khmer name, a Latin name, or both.
                  </p>
                </div>

                {/* Section: Contact */}
                <FormSectionTitle>Contact</FormSectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="Email address" required error={errors.email?.message}>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="name@example.com"
                      hasError={Boolean(errors.email)}
                    />
                  </Field>

                  <Field label="Phone number" required error={errors.phone?.message}>
                    <Input
                      {...register('phone')}
                      placeholder="+855 12 345 678"
                      hasError={Boolean(errors.phone)}
                    />
                  </Field>

                  <Field label="City" required error={errors.city?.message}>
                    <Controller
                      name="city"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={cityOptions}
                          value={field.value}
                          onChange={field.onChange}
                          creatable={true}
                          placeholder="Select city..."
                          size="md"
                        />
                      )}
                    />
                  </Field>
                </div>

                {/* Section: Service Address */}
                <FormSectionTitle>Service Address</FormSectionTitle>

                <Field label="Service street address" required error={errors.address?.message}>
                  <Input
                    {...register('address')}
                    placeholder="742 Evergreen Terrace, Apt 4B"
                    hasError={Boolean(errors.address)}
                  />
                </Field>
              </motion.div>
            )}

            {/* STEP 2: PLAN & PROVISIONING */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                <Field label="Internet subscription plan" required error={errors.planId?.message}>
                  <Controller
                    name="planId"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={planOptions}
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          const nextPlan = plans.find((p) => p.id === val);
                          const defTier = nextPlan?.bandwidthTiers?.find((t) => t.isDefault) || nextPlan?.bandwidthTiers?.[0];
                          if (defTier?.id) setSelectedTierId(defTier.id);
                        }}
                        groupBy={true}
                        placeholder="Choose subscription plan..."
                        size="md"
                      />
                    )}
                  />
                </Field>

                {(() => {
                  const currentPlan = plans.find((p) => p.id === watchedData.planId) || plans[0];
                  const currentTiers = currentPlan?.bandwidthTiers || [];
                  if (currentTiers.length <= 1) return null;
                  const tierOptions = currentTiers.map((t) => ({
                    value: t.id || `${t.downloadSpeed}M`,
                    label: `${t.label || `${t.downloadSpeed} Mbps`} — $${Number(t.price).toFixed(2)}/cycle`,
                    description: `${t.downloadSpeed} Mbps Down / ${t.uploadSpeed} Mbps Up • ${t.durationLabel || `${t.durationDays || 30} Days`}`,
                  }));
                  return (
                    <Field label="Bandwidth Option / Speed Tier">
                      <Combobox
                        options={tierOptions}
                        value={selectedTierId || currentTiers.find((t) => t.isDefault)?.id || currentTiers[0]?.id || ''}
                        onChange={(val) => setSelectedTierId(val)}
                        searchable={false}
                        clearable={false}
                        size="md"
                        placeholder="Select bandwidth tier..."
                      />
                    </Field>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="Connection medium">
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
                          size="md"
                        />
                      )}
                    />
                  </Field>

                  <Field label="Initial connection status">
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
                          size="md"
                        />
                      )}
                    />
                  </Field>
                </div>

                {/* Section: Network Configuration */}
                <FormSectionTitle>Network Configuration</FormSectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="IP address assignment" required error={errors.ipAddress?.message}>
                    <Input
                      {...register('ipAddress')}
                      placeholder="192.168.10.55"
                      className="font-mono"
                      hasError={Boolean(errors.ipAddress)}
                    />
                  </Field>

                  <Field label="ONT / Router MAC address" required error={errors.macAddress?.message}>
                    <Input
                      {...register('macAddress')}
                      placeholder="F4:5C:89:12:44:8B"
                      className="font-mono uppercase"
                      hasError={Boolean(errors.macAddress)}
                    />
                  </Field>
                </div>

                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <DatePicker
                      label="Billing due date"
                      required
                      value={field.value}
                      onChange={(_, dateStr) => field.onChange(dateStr)}
                      error={errors.dueDate?.message}
                      placeholder="mm / dd / yyyy"
                    />
                  )}
                />
              </motion.div>
            )}

            {/* STEP 3: REVIEW & CONFIRM */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-[#F26B3A]/30 space-y-3">
                  <h4 className="text-xs font-bold text-[#F26B3A] uppercase tracking-wider">
                    Provisioning Review
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Subscriber:</span>
                      <div className="space-y-0.5">
                        {watchedData.nameKm && (
                          <span lang="km" className="font-semibold text-gray-900 dark:text-gray-100 block leading-[1.5]">
                            {watchedData.nameKm}
                          </span>
                        )}
                        {watchedData.nameEn && (
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                            {watchedData.nameEn}
                          </span>
                        )}
                        {!watchedData.nameKm && !watchedData.nameEn && (
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Plan:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {plans.find((p) => p.id === watchedData.planId)?.name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Assigned IP:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        {watchedData.ipAddress}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Status:</span>
                      <span className="font-semibold text-emerald-600">
                        {watchedData.status}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block text-[11px]">Service Address:</span>
                      <span className="text-gray-800 dark:text-gray-200">
                        {watchedData.address}, {watchedData.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Operational Assignment */}
                <FormSectionTitle>Operational Assignment</FormSectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="Assigned technician">
                    <Controller
                      name="assignedTechnician"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={technicianOptions}
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Select field technician..."
                          size="md"
                        />
                      )}
                    />
                  </Field>

                  <Field label="Account tags and classification">
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
                          placeholder="Select tags..."
                          size="md"
                        />
                      )}
                    />
                  </Field>
                </div>

                <Field label="Internal notes">
                  <Textarea
                    {...register('notes')}
                    maxLength={300}
                    placeholder="Enter dispatch notes, access codes, or provisioning details..."
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </Modal>
  );
};
