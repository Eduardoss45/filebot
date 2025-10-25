# FileBot

## 1. Overview

The FileBot is an application designed to automate the organization of files within user-defined directories. It monitors folders in real-time, applies user-defined rules, and performs automated actions such as moving, renaming, or removing duplicate files. The system maintains a history of actions for easy recovery and supports both manual and automatic operation modes.

---

## 2. Business Rules

1. **Real-Time Folder Monitoring:**
   The application continuously monitors selected directories and detects new or modified files immediately.

2. **File Organization Criteria:**

   - By file type.
   - By creation or modification date.
   - By name or custom patterns defined by the user.

3. **Custom Rules:**
   Users can create personalized rules for each monitored folder, specifying actions to be applied to specific file types or patterns.

4. **Automated Actions:**
   The system can automatically move files to designated folders, rename them according to rules, and remove duplicate files.

5. **History Tracking:**
   All automated actions are logged to provide a clear history, enabling users to review or recover changes.

6. **Operation Modes:**
   Users can choose between automatic and manual modes. Manual mode allows user confirmation before applying actions.

7. **Protection Mechanisms:**
   Files can be marked as protected to prevent accidental movement or deletion.

---

## 3. Functional Requirements

1. **User Interface:**
   A clear and intuitive interface for selecting folders and defining rules.

2. **Multi-Folder Support:**
   The system supports monitoring multiple directories simultaneously.

3. **Undo Actions:**
   Users can undo the most recent action performed by the system.

4. **Background Execution:**
   The application can run in the background without user intervention.

5. **Action Logs:**
   A detailed log of all actions performed is maintained for auditing and troubleshooting purposes.

6. **Exceptions Handling:**
   Users can define files or patterns to be ignored by the system, preventing unintended movements or modifications.

---

## 4. Technical Requirements

1. **Frameworks and Environment:**

   - Electron.js and Node.js are used to create a desktop application with real-time capabilities.

2. **File Operations:**

   - `fs-extra` is utilized for advanced file and folder manipulations.
   - `chokidar` is used for efficient, real-time monitoring of filesystem changes.

3. **Logging:**

   - `log4js` is implemented to generate structured logs of all system activities.

4. **Database Management:**

   - `sqlite3` is used to store user rules, monitoring configurations, and historical data.

---

## 5. Summary

The FileBot provides a robust, flexible, and user-friendly solution for managing files automatically. By combining real-time monitoring, custom rule application, automated actions, and persistent history tracking, it ensures that users can maintain organized directories with minimal manual intervention while preserving the ability to recover and review all changes.
