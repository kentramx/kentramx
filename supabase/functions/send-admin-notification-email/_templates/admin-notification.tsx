import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface AdminNotificationEmailProps {
  adminName: string;
  notificationType: 'bypass' | 'upgrade' | 'downgrade';
  userName: string;
  planName: string;
  timestamp: string;
  isAdminChange: boolean;
}

export const AdminNotificationEmail = ({
  adminName,
  notificationType,
  userName,
  planName,
  timestamp,
  isAdminChange,
}: AdminNotificationEmailProps) => {
  const previewText = notificationType === 'bypass' 
    ? `Bypass de cooldown detectado para ${userName}`
    : notificationType === 'upgrade'
    ? `${userName} mejoró su plan a ${planName}`
    : `${userName} bajó su plan a ${planName}`;

  const getNotificationIcon = () => {
    if (notificationType === 'bypass') return '⚠️';
    if (notificationType === 'upgrade') return '📈';
    return '📉';
  };

  const getNotificationColor = () => {
    if (notificationType === 'bypass') return '#9333ea'; // purple
    if (notificationType === 'upgrade') return '#16a34a'; // green
    return '#f59e0b'; // amber
  };

  const getNotificationTitle = () => {
    if (notificationType === 'bypass') {
      return isAdminChange 
        ? 'Admin Forzó Cambio de Plan'
        : 'Bypass de Cooldown Detectado';
    }
    if (notificationType === 'upgrade') return 'Nuevo Upgrade de Plan';
    return 'Downgrade de Plan';
  };

  const getNotificationDescription = () => {
    if (notificationType === 'bypass') {
      return isAdminChange
        ? `Un administrador forzó un cambio de plan para ${userName} a ${planName}, evitando el período de espera de 30 días.`
        : `Se detectó un bypass del período de cooldown de 30 días. ${userName} cambió a ${planName}.`;
    }
    if (notificationType === 'upgrade') {
      return `${userName} mejoró su plan a ${planName}. Esto es una señal positiva de crecimiento.`;
    }
    return `${userName} bajó su plan a ${planName}. Considera hacer seguimiento para entender las razones.`;
  };

  const formattedDate = new Date(timestamp).toLocaleString('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {getNotificationIcon()} Notificación Administrativa
          </Heading>
          
          <Text style={greeting}>Hola {adminName},</Text>
          
          <Section style={{
            ...alertBox,
            borderLeft: `4px solid ${getNotificationColor()}`,
          }}>
            <Heading style={h2}>{getNotificationTitle()}</Heading>
            <Text style={text}>
              {getNotificationDescription()}
            </Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Usuario:</Text>
            <Text style={detailValue}>{userName}</Text>
            
            <Text style={detailLabel}>Nuevo Plan:</Text>
            <Text style={detailValue}>{planName}</Text>
            
            <Text style={detailLabel}>Fecha y Hora:</Text>
            <Text style={detailValue}>{formattedDate}</Text>
            
            {isAdminChange && (
              <>
                <Text style={detailLabel}>Tipo de Cambio:</Text>
                <Text style={{ ...detailValue, color: '#9333ea', fontWeight: 'bold' }}>
                  Forzado por Administrador
                </Text>
              </>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Link
              href="https://kentramx.lovable.app/admin/subscription-changes"
              style={button}
            >
              Ver Panel de Auditoría
            </Link>
          </Section>

          <Text style={footer}>
            Este es un email automático del sistema de notificaciones administrativas de Kentra.
            Puedes configurar tus preferencias de notificación en el panel de administrador.
          </Text>
          
          <Text style={footer}>
            <Link
              href="https://kentramx.lovable.app/admin/notification-settings"
              style={{ ...link, color: '#898989' }}
            >
              Configurar Notificaciones
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminNotificationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px',
};

const greeting = {
  color: '#333',
  fontSize: '16px',
  margin: '0 40px 20px',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
};

const alertBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 40px 24px',
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 40px 24px',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '16px 0 4px',
  letterSpacing: '0.5px',
};

const detailValue = {
  color: '#333',
  fontSize: '14px',
  margin: '0 0 8px',
};

const buttonContainer = {
  margin: '0 40px 24px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  fontWeight: 'bold',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '24px 40px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};
