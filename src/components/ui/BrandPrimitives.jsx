import React from 'react'

/**
 * Zyrbit Mobile-First Brand UI Primitives
 * Conforms to approved Petrol Teal / Warm Ivory design system:
 * - Petrol Teal: #174A55
 * - Warm Ivory: #F4F0E8
 * - Deep Charcoal: #111A20
 * - Muted Petrol Blue: #367887
 * - Soft Teal: #DDE9EB
 * - White: #FFFEFB
 * - Border: #E5E0D8
 * - Muted text: #68777B
 */

export const BrandBadge = ({ size = 32, shape = 'square', style = {} }) => {
  const isSquare = shape === 'square'
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: isSquare ? Math.round(size * 0.28) : '50%',
        backgroundColor: 'var(--brand-petrol, #174A55)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.round(size * 0.5),
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.02em',
        boxShadow: '0 2px 8px rgba(23, 74, 85, 0.2)',
        flexShrink: 0,
        ...style,
      }}
    >
      Z
    </div>
  )
}

export const BrandHeader = ({ dark = false, style = {} }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        ...style,
      }}
    >
      <BrandBadge size={32} shape="square" />
      <span
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '0.14em',
          color: dark ? '#FFFFFF' : 'var(--brand-charcoal, #111A20)',
          textTransform: 'uppercase',
        }}
      >
        ZYRBIT
      </span>
    </div>
  )
}

export const BrandButton = ({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'social' | 'pill'
  disabled = false,
  loading = false,
  icon = null,
  style = {},
  type = 'button',
  fullWidth = true,
  ...restProps
}) => {
  const isPrimary = variant === 'primary' || variant === 'pill'
  const isPill = variant === 'pill'
  const isOutline = variant === 'outline' || variant === 'secondary'
  const isSocial = variant === 'social'

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: fullWidth ? '100%' : 'auto',
    height: '52px',
    borderRadius: isPill ? '999px' : 'var(--brand-radius-btn, 14px)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.18s ease-in-out',
    border: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    padding: '0 20px',
  }

  let variantStyle = {}
  if (isPrimary) {
    variantStyle = {
      backgroundColor: 'var(--brand-petrol, #174A55)',
      color: '#FFFFFF',
      boxShadow: '0 4px 14px rgba(23, 74, 85, 0.22)',
    }
  } else if (isOutline) {
    variantStyle = {
      backgroundColor: 'transparent',
      color: 'var(--brand-charcoal, #111A20)',
      border: '1.5px solid var(--brand-border, #E5E0D8)',
    }
  } else if (isSocial) {
    variantStyle = {
      backgroundColor: '#FFFEFB',
      color: 'var(--brand-charcoal, #111A20)',
      border: '1.5px solid var(--brand-border, #E5E0D8)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      fontWeight: 600,
      fontSize: '14px',
    }
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      {...restProps}
      style={{ ...baseStyle, ...variantStyle, ...style }}
      onMouseDown={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.985)'
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(1)'
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {loading ? (
        <span
          style={{
            width: '18px',
            height: '18px',
            border: `2px solid ${isPrimary ? '#FFFFFF' : '#174A55'}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'local-spin 0.6s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : (
        <>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}

export const BrandInput = ({
  icon = null,
  rightElement = null,
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  onKeyDown,
  error = false,
  disabled = false,
  id,
  name,
  autoComplete,
  style = {},
}) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '52px',
        backgroundColor: '#FFFEFB',
        borderRadius: 'var(--brand-radius-input, 14px)',
        border: `1.5px solid ${error ? '#EF4444' : 'var(--brand-border, #E5E0D8)'}`,
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        boxSizing: 'border-box',
        padding: '0 16px',
        ...style,
      }}
      onFocusCapture={(e) => {
        if (!error) {
          e.currentTarget.style.borderColor = 'var(--brand-petrol, #174A55)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23, 74, 85, 0.1)'
        }
      }}
      onBlurCapture={(e) => {
        if (!error) {
          e.currentTarget.style.borderColor = 'var(--brand-border, #E5E0D8)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {icon && (
        <div
          style={{
            color: 'var(--brand-text-sub, #68777B)',
            display: 'flex',
            alignItems: 'center',
            marginRight: '12px',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '15px',
          color: 'var(--brand-charcoal, #111A20)',
          fontFamily: "'Inter', sans-serif",
          width: '100%',
        }}
      />
      {rightElement && (
        <div
          style={{
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--brand-text-sub, #68777B)',
            cursor: 'pointer',
          }}
        >
          {rightElement}
        </div>
      )}
    </div>
  )
}

export const BrandStepProgress = ({ currentStep = 1, totalSteps = 4, label = 'GOALS' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isDone = stepNum < currentStep
          return (
            <div
              key={stepNum}
              style={{
                height: '4px',
                width: isActive ? '36px' : '8px',
                borderRadius: '999px',
                backgroundColor: isActive || isDone ? 'var(--brand-petrol, #174A55)' : '#D8D3CA',
                transition: 'all 0.28s ease',
              }}
            />
          )
        })}
      </div>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 750,
          letterSpacing: '0.12em',
          color: 'var(--brand-petrol, #174A55)',
          textTransform: 'uppercase',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        STEP {currentStep} OF {totalSteps} · {label}
      </div>
    </div>
  )
}

export const BrandOptionCard = ({
  icon,
  title,
  subtitle,
  selected = false,
  onClick,
  style = {},
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 18px',
        borderRadius: 'var(--brand-radius-card, 16px)',
        backgroundColor: selected ? 'var(--brand-soft-teal, #DDE9EB)' : '#FFFEFB',
        border: `1.5px solid ${selected ? 'var(--brand-petrol, #174A55)' : 'var(--brand-border, #E5E0D8)'}`,
        boxShadow: selected
          ? '0 4px 14px rgba(23, 74, 85, 0.08)'
          : '0 2px 6px rgba(0, 0, 0, 0.02)',
        cursor: 'pointer',
        transition: 'all 0.16s ease-in-out',
        userSelect: 'none',
        gap: '14px',
        ...style,
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          backgroundColor: selected ? 'var(--brand-petrol, #174A55)' : '#FFFFFF',
          border: selected ? 'none' : '1.5px solid #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          flexShrink: 0,
          transition: 'all 0.16s ease',
        }}
      >
        {selected && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Feature Icon */}
      {icon && (
        <div
          style={{
            color: 'var(--brand-petrol, #174A55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: '24px',
            height: '24px',
          }}
        >
          {icon}
        </div>
      )}

      {/* Title & Subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '15.5px',
            fontWeight: 700,
            color: 'var(--brand-charcoal, #111A20)',
            letterSpacing: '-0.01em',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: '12.5px',
              color: 'var(--brand-text-sub, #68777B)',
              marginTop: '2px',
              lineHeight: 1.35,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
