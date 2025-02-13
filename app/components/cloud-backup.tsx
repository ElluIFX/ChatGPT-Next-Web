// src/cloud-backup.tsx

import React, { useState, useEffect } from "react";
import styles from "./cloud-backup.module.scss";
import { useAccessStore } from "../store";
import {
  getLocalAppState,
  mergeAppState,
  setLocalAppState,
} from "../utils/sync";
import { safeLocalStorage } from "../utils";
import { getClientConfig } from "../config/client";
import { IconButton } from "./button";
import { showConfirm, showToast } from "./ui-lib";
import { useChatStore } from "../store";
import { useNavigate } from "react-router-dom";
import { useMobileScreen } from "../utils";
import CloseIcon from "../icons/close.svg";
import Locale from "../locales";

interface FileInfo {
  name: string;
  size: number;
}

const localStorage = safeLocalStorage();
const serverAddressKey = "serverAddress";
const userNameKey = "userName";

// Generate a random UUID v4
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CloudBackupPage() {
  const navigate = useNavigate();
  const isMobileScreen = useMobileScreen();
  const [serverAddress, setServerAddress] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [importingFileNames, setImportingFileNames] = useState<Set<string>>(
    new Set(),
  );
  const [renamingFileNames, setRenamingFileNames] = useState<Set<string>>(
    new Set(),
  );
  const [renameInputs, setRenameInputs] = useState<{ [key: string]: string }>(
    {},
  );
  const accessStore = useAccessStore();
  const chatStore = useChatStore();
  var collisionString = "";

  useEffect(() => {
    // 从 localStorage 读取文件服务器地址
    const savedAddress = localStorage.getItem(serverAddressKey);
    const savedUserName = localStorage.getItem(userNameKey);
    if (savedAddress) {
      setServerAddress(savedAddress);
    }
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  const handleServerAddressChange = (address: string) => {
    setServerAddress(address);
    if (typeof window !== "undefined") {
      // 安全地使用 localStorage
      localStorage.setItem(serverAddressKey, address); // 保存到 localStorage
    }
  };

  const handleUserNameChange = (name: string) => {
    setUserName(name);
    if (typeof window !== "undefined") {
      localStorage.setItem(userNameKey, name); // 保存到 localStorage
    }
  };

  const handleBackup = async () => {
    if (serverAddress.trim() === "") {
      handleServerAddressChange(accessStore.defaultBackupServerAddress);
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressReset,
        type: "info",
      });
      return;
    }
    if (userName.trim() === "") {
      setMessage({
        text: Locale.CloudBackup.Messages.UserNameRequired,
        type: "error",
      });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressFormatError,
        type: "error",
      });
      return;
    }
    setBackupLoading(true);
    setMessage(null);
    setUploadProgress(0);

    const isApp = !!getClientConfig()?.isApp;
    const datePart = isApp
      ? `${new Date().toLocaleDateString().replace(/\//g, "_")}_${new Date()
          .toLocaleTimeString([], { hour12: false })
          .replace(/:/g, "_")}` // 使用 24 小时制时间并替换 ":" 为 "_"
      : new Date().toLocaleString().replace(/[\/:]/g, "_"); // 替换日期和时间中的 "/" 和 ":" 为 "_"
    const fileName = `Backup-${datePart}.json`;

    const state = getLocalAppState();
    const jsonBlob = new Blob([JSON.stringify(state)], {
      type: "application/json",
    });

    // 获取并格式化文件大小
    const fileSize = formatFileSize(jsonBlob.size);

    // 显示待上传文件的大小
    setMessage({
      text: `${Locale.CloudBackup.Messages.FileTooBig}${fileSize}`,
      type: "info",
    });

    const formData = new FormData();
    formData.append("file", jsonBlob, fileName);

    // 创建 XMLHttpRequest 对象
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${serverAddress}/api/backup`, true);
    // 设置请求头
    xhr.setRequestHeader("accessCode", accessStore.accessCode);
    xhr.setRequestHeader("collisionString", collisionString);
    xhr.setRequestHeader("userName", userName);

    // 监听上传进度事件
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    // 监听请求完成
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        setMessage({
          text: Locale.CloudBackup.Messages.UploadSuccess,
          type: "success",
        });
        handleImport(true);
      } else {
        const errorData = JSON.parse(xhr.responseText);
        setMessage({
          text: Locale.CloudBackup.Messages.UploadFailed,
          type: "error",
        });
      }
      setBackupLoading(false);
    };

    // 监听请求错误
    xhr.onerror = () => {
      setMessage({
        text: Locale.CloudBackup.Messages.UploadFailed,
        type: "error",
      });
      setBackupLoading(false);
    };

    // 发送请求
    xhr.send(formData);
  };

  const handleImport = async (skipSuccessMessage: boolean = false) => {
    if (serverAddress.trim() === "") {
      handleServerAddressChange(accessStore.defaultBackupServerAddress);
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressReset,
        type: "info",
      });
      return;
    }
    if (userName.trim() === "") {
      setMessage({
        text: Locale.CloudBackup.Messages.UserNameRequired,
        type: "error",
      });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressFormatError,
        type: "error",
      });
      return;
    }
    setImportLoading(true);
    setFiles([]);
    if (!skipSuccessMessage) {
      setMessage(null);
    }
    try {
      const response = await fetch(`${serverAddress}/api/getlist`, {
        headers: {
          accessCode: accessStore.accessCode,
          collisionString: collisionString,
          userName: userName,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(Locale.CloudBackup.Messages.ListFetchFailed);
      }
      const data: FileInfo[] = await response.json();
      setFiles(data);
      if (!skipSuccessMessage) {
        setMessage({
          text: Locale.CloudBackup.Messages.ListFetchSuccess,
          type: "success",
        });
      }
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: Locale.CloudBackup.Messages.ListFetchFailed,
        type: "error",
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleRename = (fileName: string) => {
    setRenamingFileNames((prev) => new Set(prev).add(fileName));
    setRenameInputs((prev) => ({ ...prev, [fileName]: fileName }));
  };

  const handleCancelRename = (fileName: string) => {
    setRenamingFileNames((prev) => {
      const newSet = new Set(prev); // 创建一个新的 Set
      newSet.delete(fileName); // 从新的 Set 中删除元素
      return newSet; // 返回新的 Set 作为新的状态
    });
  };

  const handleRenameChange = (fileName: string, newName: string) => {
    setRenameInputs((prev) => ({ ...prev, [fileName]: newName }));
  };

  const handleRenameSubmit = async (fileName: string) => {
    const newName = renameInputs[fileName]?.trim();
    if (!newName) {
      setMessage({ text: "文件名不能为空", type: "error" });
      return;
    }
    if (userName.trim() === "") {
      setMessage({ text: "标识符不能为空", type: "error" });
      return;
    }
    if (serverAddress.trim() === "") {
      handleServerAddressChange(accessStore.defaultBackupServerAddress);
      setMessage({ text: "备份服务器地址已重置为默认值", type: "info" });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({ text: "无效的文件服务器地址", type: "error" });
      return;
    }
    setRenamingFileNames((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${serverAddress}/api/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accessCode: accessStore.accessCode,
          collisionString: collisionString,
          userName: userName,
        },
        body: JSON.stringify({ oldName: fileName, newName }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("重命名失败");
      }
      const data = await response.json();
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.name === fileName ? { ...file, name: newName } : file,
        ),
      );
      setMessage({ text: data.message || "文件重命名成功！", type: "success" });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: "文件重命名失败，请重试",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (fileName: string) => {
    if (!(await showConfirm(Locale.CloudBackup.Messages.ImportConfirm))) {
      return;
    }
    if (userName.trim() === "") {
      setMessage({
        text: Locale.CloudBackup.Messages.UserNameRequired,
        type: "error",
      });
      return;
    }
    if (serverAddress.trim() === "") {
      handleServerAddressChange(accessStore.defaultBackupServerAddress);
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressReset,
        type: "info",
      });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressFormatError,
        type: "error",
      });
      return;
    }
    setImportingFileNames((prev) => new Set(prev).add(fileName));
    setMessage(null);
    try {
      const response = await fetch(
        `${serverAddress}/api/import?filename=${fileName}`,
        {
          method: "GET",
          headers: {
            accessCode: accessStore.accessCode,
            collisionString: collisionString,
            userName: userName,
          },
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(Locale.CloudBackup.Messages.DownloadFailed);
      }
      const data = await response.json();
      const localState = getLocalAppState(); // 获取本地状态

      // 合并远程和本地状态
      mergeAppState(localState, data);
      setLocalAppState(localState); // 更新本地状态

      setMessage({
        text: data.message || Locale.CloudBackup.Messages.ImportSuccess,
        type: "success",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: Locale.CloudBackup.Messages.DownloadFailed,
        type: "error",
      });
    } finally {
      setImportingFileNames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const handleFileDelete = async (fileName: string) => {
    if (!(await showConfirm(Locale.CloudBackup.Messages.DeleteConfirm))) {
      return;
    }
    if (userName.trim() === "") {
      setMessage({
        text: Locale.CloudBackup.Messages.UserNameRequired,
        type: "error",
      });
      return;
    }
    if (serverAddress.trim() === "") {
      handleServerAddressChange(accessStore.defaultBackupServerAddress);
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressReset,
        type: "info",
      });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressFormatError,
        type: "error",
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${serverAddress}/api/delete/${fileName}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          accessCode: accessStore.accessCode,
          collisionString: collisionString,
          userName: userName,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(Locale.CloudBackup.Messages.DeleteFailed);
      }
      const data = await response.json();
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.name !== fileName),
      );
      setMessage({
        text: data.message || Locale.CloudBackup.Messages.DeleteSuccess,
        type: "success",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: Locale.CloudBackup.Messages.DeleteFailed,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleALLFileDelete = async () => {
    if (!(await showConfirm(Locale.CloudBackup.Messages.DeleteAllConfirm))) {
      return;
    }
    if (userName.trim() === "") {
      setMessage({
        text: Locale.CloudBackup.Messages.UserNameRequired,
        type: "error",
      });
      return;
    }
    if (serverAddress.trim() === "") {
      handleServerAddressChange(accessStore.defaultBackupServerAddress);
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressReset,
        type: "info",
      });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({
        text: Locale.CloudBackup.Messages.ServerAddressFormatError,
        type: "error",
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${serverAddress}/api/deleteALL`, {
        method: "DELETE",
        headers: {
          accessCode: accessStore.accessCode,
          collisionString: collisionString,
          userName: userName,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(Locale.CloudBackup.Messages.DeleteFailed);
      }
      const data = await response.json();
      setFiles([]);
      setMessage({
        text: data.message || Locale.CloudBackup.Messages.DeleteAllSuccess,
        type: "success",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: Locale.CloudBackup.Messages.DeleteFailed,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${size} ${sizes[i]}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.window}>
        <div className={styles["window-header"]}>
          <div className={styles["window-header-title"]}>
            <div className={styles["window-header-main-title"]}>
              {Locale.CloudBackup.Title}
            </div>
            <div className={styles["window-header-sub-title"]}>
              {Locale.CloudBackup.SubTitle}
            </div>
          </div>
          <div className={styles["window-actions"]}>
            <div className={styles["window-action-button"]}>
              <IconButton
                icon={<CloseIcon />}
                onClick={() => navigate(-1)}
                bordered
                title={Locale.UI.Close}
              />
            </div>
          </div>
        </div>

        <div className={styles["window-content"]}>
          <div className={styles["settings-container"]}>
            <div className={styles["input-container"]}>
              <input
                type="text"
                id={serverAddressKey}
                value={serverAddress}
                onChange={(e) => handleServerAddressChange(e.target.value)}
                placeholder={Locale.CloudBackup.Placeholders.ServerAddress}
                disabled={loading}
              />
              <input
                type="text"
                id={userNameKey}
                value={userName}
                onChange={(e) => handleUserNameChange(e.target.value)}
                placeholder={Locale.CloudBackup.Placeholders.UserName}
                disabled={loading}
              />
            </div>

            <div className={styles["button-container"]}>
              <IconButton
                text={Locale.CloudBackup.Actions.DeleteLocal}
                onClick={async () => {
                  if (
                    await showConfirm(
                      Locale.CloudBackup.Messages.ClearLocalConfirm,
                    )
                  ) {
                    chatStore.clearAllData();
                  }
                }}
                type="danger"
              />
              <IconButton
                text={Locale.CloudBackup.Actions.DeleteAll}
                onClick={async () => {
                  if (
                    await showConfirm(
                      Locale.CloudBackup.Messages.DeleteAllConfirm,
                    )
                  ) {
                    await handleALLFileDelete();
                    setFiles([]);
                  }
                }}
                type="danger"
              />
              <IconButton
                text={Locale.CloudBackup.Actions.GenerateNewId}
                onClick={async () => {
                  if (
                    userName.trim() === "" ||
                    (await showConfirm(
                      Locale.CloudBackup.Messages.NewIdConfirm,
                    ))
                  ) {
                    handleUserNameChange(generateUUID());
                    setMessage({
                      text: Locale.CloudBackup.Messages.NewIdSuccess,
                      type: "info",
                    });
                    setFiles([]);
                  }
                }}
                type={userName.trim() === "" ? "primary" : "danger"}
              />
            </div>

            <div className={styles["backup-actions"]}>
              <IconButton
                text={
                  backupLoading
                    ? Locale.CloudBackup.Actions.UploadingStatus
                    : Locale.CloudBackup.Actions.Upload
                }
                onClick={handleBackup}
                disabled={backupLoading}
                type="primary"
              />
              <IconButton
                text={
                  importLoading
                    ? Locale.CloudBackup.Actions.DownloadingStatus
                    : Locale.CloudBackup.Actions.Download
                }
                onClick={() => handleImport(false)}
                disabled={importLoading}
                type="primary"
              />
            </div>

            {backupLoading && (
              <div className={styles["progress-container"]}>
                <progress value={uploadProgress} max="100" />
                <span>{uploadProgress}%</span>
              </div>
            )}

            {message && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </div>
            )}

            {files.length === 0 && (
              <div className={styles["file-list"]}>
                <div className={styles["file-list-header"]}>
                  {Locale.CloudBackup.CloudList.Title}
                </div>
                <div className={styles["file-list-content"]}>
                  <div className={styles["file-item-center-text"]}>
                    {Locale.CloudBackup.Messages.NoFiles}
                  </div>
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className={styles["file-list"]}>
                <div className={styles["file-list-header"]}>
                  {Locale.CloudBackup.CloudList.Title}
                </div>
                <div className={styles["file-list-content"]}>
                  {files
                    .sort((a, b) => b.name.localeCompare(a.name))
                    .map((file) => (
                      <div key={file.name} className={styles["file-item"]}>
                        <div className={styles["file-info"]}>
                          {renamingFileNames.has(file.name) ? (
                            <input
                              type="text"
                              value={renameInputs[file.name] || file.name}
                              onChange={(e) =>
                                handleRenameChange(file.name, e.target.value)
                              }
                              className={styles["rename-input"]}
                            />
                          ) : (
                            <span className={styles["file-name"]}>
                              {file.name} ({formatFileSize(file.size)})
                            </span>
                          )}
                        </div>

                        <div className={styles["file-actions"]}>
                          {renamingFileNames.has(file.name) ? (
                            <>
                              <IconButton
                                text={
                                  Locale.CloudBackup.CloudList.RenameConfirm
                                }
                                onClick={() => handleRenameSubmit(file.name)}
                                disabled={loading}
                                type="primary"
                              />
                              <IconButton
                                text={Locale.CloudBackup.CloudList.RenameCancel}
                                onClick={() => handleCancelRename(file.name)}
                                disabled={loading}
                              />
                            </>
                          ) : (
                            <>
                              <IconButton
                                text={Locale.CloudBackup.CloudList.RenameTitle}
                                onClick={() => handleRename(file.name)}
                                disabled={loading}
                                type="primary"
                              />
                              <IconButton
                                text={
                                  importingFileNames.has(file.name)
                                    ? Locale.CloudBackup.Actions
                                        .DownloadingStatus
                                    : Locale.CloudBackup.CloudList.ImportTitle
                                }
                                onClick={() => handleFileImport(file.name)}
                                disabled={
                                  importingFileNames.has(file.name) || loading
                                }
                                type="primary"
                              />
                              <IconButton
                                text={Locale.CloudBackup.CloudList.DeleteTitle}
                                onClick={() => handleFileDelete(file.name)}
                                disabled={loading}
                                type="danger"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div className={styles["page-bottom"]}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
