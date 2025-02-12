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
import DownloadIcon from "../icons/download.svg";
import UploadIcon from "../icons/upload.svg";

interface FileInfo {
  name: string;
  size: number;
}

const localStorage = safeLocalStorage();
const serverAddressKey = "serverAddress";
const userNameKey = "userName";

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
  const [isMessageVisible, setIsMessageVisible] = useState(false);
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
      setServerAddress(accessStore.defaultBackupServerAddress);
      setMessage({ text: "备份服务器地址已重置为默认值", type: "info" });
      return;
    }
    if (userName.trim() === "") {
      setMessage({ text: "用户名不能为空", type: "error" });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({ text: "无效的文件服务器地址", type: "error" });
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
    setMessage({ text: `准备上传文件，大小：${fileSize}`, type: "info" });

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
        showToast(data.message || "云备份成功！");
        setMessage({ text: data.message || "云备份成功！", type: "success" });
        // 执行一次云导入更新列表
        handleImport();
      } else {
        const errorData = JSON.parse(xhr.responseText);
        setMessage({
          text: errorData.message || "备份失败",
          type: "error",
        });
      }
      setBackupLoading(false);
    };

    // 监听请求错误
    xhr.onerror = () => {
      setMessage({
        text: "云备份失败，请重试",
        type: "error",
      });
      setBackupLoading(false);
    };

    // 发送请求
    xhr.send(formData);
  };

  const handleImport = async () => {
    if (serverAddress.trim() === "") {
      setServerAddress("https://next-backup.hk.ellu.tech");
      setMessage({ text: "备份服务器地址已重置为默认值", type: "info" });
      return;
    }
    if (userName.trim() === "") {
      setMessage({ text: "用户名不能为空", type: "error" });
      return;
    }
    try {
      const parsedUrl = new URL(serverAddress);
      collisionString = parsedUrl.hostname;
    } catch (error) {
      setMessage({ text: "无效的文件服务器地址", type: "error" });
      return;
    }
    setImportLoading(true);
    setMessage(null);
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
        throw new Error(errorData.message || "获取文件列表失败");
      }
      const data: FileInfo[] = await response.json();
      setFiles(data);
      setMessage({ text: "文件列表加载成功！", type: "success" });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: error.message || "获取文件列表失败，请重试",
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
      setMessage({ text: "用户名不能为空", type: "error" });
      return;
    }
    if (serverAddress.trim() === "") {
      setServerAddress("https://next-backup.hk.ellu.tech");
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
        throw new Error(errorData.message || "重命名失败");
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
        text: error.message || "文件重命名失败，请重试",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (fileName: string) => {
    if (
      !(await showConfirm(
        "确定要导入该文件吗？该操作将覆盖本地对话记录，且不可撤回！",
      ))
    ) {
      return;
    }
    if (userName.trim() === "") {
      setMessage({ text: "用户名不能为空", type: "error" });
      return;
    }
    if (serverAddress.trim() === "") {
      setServerAddress("https://next-backup.hk.ellu.tech");
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
        throw new Error(errorData.message || "文件导入失败");
      }
      const data = await response.json();
      const localState = getLocalAppState(); // 获取本地状态

      // 合并远程和本地状态
      mergeAppState(localState, data);
      setLocalAppState(localState); // 更新本地状态

      setMessage({
        text: data.message || `文件 ${fileName} 导入成功！`,
        type: "success",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: error.message || `文件 ${fileName} 导入失败，请重试`,
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
    if (!(await showConfirm("确定要删除该文件吗？该操作不可撤回！"))) {
      return;
    }
    if (userName.trim() === "") {
      setMessage({ text: "用户名不能为空", type: "error" });
      return;
    }
    if (serverAddress.trim() === "") {
      setServerAddress("https://next-backup.hk.ellu.tech");
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
        throw new Error(errorData.message || "文件删除失败");
      }
      const data = await response.json();
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.name !== fileName),
      );
      setMessage({
        text: data.message || `文件 ${fileName} 删除成功！`,
        type: "success",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: error.message || `文件 ${fileName} 删除失败，请重试`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleALLFileDelete = async () => {
    if (
      !(await showConfirm("确定要删除云端所有对话记录吗？该操作不可撤回！"))
    ) {
      return;
    }
    if (userName.trim() === "") {
      setMessage({ text: "用户名不能为空", type: "error" });
      return;
    }
    if (serverAddress.trim() === "") {
      setServerAddress("https://next-backup.hk.ellu.tech");
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
        throw new Error(errorData.message || "文件删除失败");
      }
      const data = await response.json();
      setFiles([]);
      setMessage({
        text: data.message || `所有云端对话记录已成功清除！`,
        type: "success",
      });
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: error.message || `云端对话记录已成功清除删除失败，请重试`,
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

  // 处理消息显示和自动隐藏
  useEffect(() => {
    if (message) {
      setIsMessageVisible(true);
      const timer = setTimeout(() => {
        setIsMessageVisible(false);
        setTimeout(() => setMessage(null), 300); // 等待淡出动画完成后再清除消息
      }, 3000); // 3秒后开始淡出
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className={styles.container}>
      <div className={styles.window}>
        <div className={styles["window-header"]}>
          <div className={styles["window-header-title"]}>
            <div className={styles["window-header-main-title"]}>云备份管理</div>
            <div className={styles["window-header-sub-title"]}>
              备份和恢复您的聊天记录
            </div>
          </div>
          <div className={styles["window-actions"]}>
            <div className={styles["window-action-button"]}>
              <IconButton
                icon={<CloseIcon />}
                onClick={() => navigate(-1)}
                bordered
                title="关闭"
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
                placeholder={`请输入备份服务器地址 (默认: ${accessStore.defaultBackupServerAddress})`}
                disabled={loading}
              />
              <input
                type="text"
                id={userNameKey}
                value={userName}
                onChange={(e) => handleUserNameChange(e.target.value)}
                placeholder="请输入用户名 (您的唯一标识符, 备份和恢复时需要一致)"
                disabled={loading}
              />
              <div className={styles["button-container"]}>
                <IconButton
                  text="清除本地所有对话和设置"
                  onClick={async () => {
                    if (await showConfirm("确认清除所有聊天、设置数据？")) {
                      chatStore.clearAllData();
                    }
                  }}
                  type="danger"
                />
                <IconButton
                  text="清除云端所有对话记录"
                  onClick={async () => {
                    if (await showConfirm("确认清除所有聊天、设置数据？")) {
                      await handleALLFileDelete();
                    }
                  }}
                  type="danger"
                />
              </div>
            </div>

            <div className={styles["backup-actions"]}>
              <IconButton
                text={backupLoading ? "上传中..." : "备份当前数据到云端"}
                onClick={handleBackup}
                disabled={backupLoading}
                type="primary"
                icon={<UploadIcon />}
              />
              <IconButton
                text={importLoading ? "加载中..." : "加载云端备份记录"}
                onClick={handleImport}
                disabled={importLoading}
                type="primary"
                icon={<DownloadIcon />}
              />
            </div>

            {backupLoading && (
              <div className={styles["progress-container"]}>
                <progress value={uploadProgress} max="100" />
                <span>{uploadProgress}%</span>
              </div>
            )}

            {files.length > 0 && (
              <div className={styles["file-list"]}>
                <div className={styles["file-list-header"]}>云端备份列表</div>
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
                                text="确认"
                                onClick={() => handleRenameSubmit(file.name)}
                                disabled={loading}
                                type="primary"
                              />
                              <IconButton
                                text="取消"
                                onClick={() => handleCancelRename(file.name)}
                                disabled={loading}
                              />
                            </>
                          ) : (
                            <>
                              <IconButton
                                text="重命名"
                                onClick={() => handleRename(file.name)}
                                disabled={loading}
                                type="primary"
                              />
                              <IconButton
                                text={
                                  importingFileNames.has(file.name)
                                    ? "导入中..."
                                    : "导入"
                                }
                                onClick={() => handleFileImport(file.name)}
                                disabled={
                                  importingFileNames.has(file.name) || loading
                                }
                                type="primary"
                              />
                              <IconButton
                                text="删除"
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

            {message && (
              <div
                className={`${styles.message} ${styles[message.type]}`}
                style={{ opacity: isMessageVisible ? 1 : 0 }}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
