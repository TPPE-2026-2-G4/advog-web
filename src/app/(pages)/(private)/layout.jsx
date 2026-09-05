import Navbar from '@/components/layout/navbar/navbar';
import Sidebar from '@/components/layout/sidebar/sidebar';
import styles from './privateLayout.module.css';

export default function PrivateLayout({ children }) {
  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.contentContainer}>
        <Navbar />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
