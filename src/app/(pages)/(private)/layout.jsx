import Navbar from '@/components/layout/navbar/navbar';
import Sidebar from '@/components/layout/sidebar/sidebar';
import styles from '@/components/layout/navbar/navbar.module.css';

export default function PrivateLayout({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F9F9F8',
      }}
    >
      <Sidebar />

      <div
        style={{
          width: 'calc(100% - 80px)',
          minWidth: 0,
          marginLeft: '80px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Navbar />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
