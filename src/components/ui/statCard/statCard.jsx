import styles from './statCard.module.css';

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = '#C1A077',
  valueColor = '#111827',
}) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        {Icon && <Icon size={20} color={iconColor} />}
      </div>
      <p className={styles.value} style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}
