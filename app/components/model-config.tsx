import { ServiceProvider } from "@/app/constant";
import { ModalConfigValidator, ModelConfig } from "../store";

import Locale from "../locales";
import { InputRange } from "./input-range";
import { ListItem, Select } from "./ui-lib";
import { useAllModels } from "../utils/hooks";
import { groupBy } from "lodash-es";

export function ModelConfigList(props: {
  modelConfig: ModelConfig;
  updateConfig: (updater: (config: ModelConfig) => void) => void;
}) {
  // const { compressModel } = useAccessStore();
  // let [compressModelName, compressModelProviderName] = compressModel.split(/@(?=[^@]*$)/);
  // compressModelProviderName = compressModelProviderName || compressModelName || "OpenAI";
  // const compressModelObj = {
  //   name: compressModelName,
  //   displayName: compressModelName,
  //   available: !!compressModelName,
  //   provider: {
  //     id: compressModelProviderName.toLowerCase(),
  //     providerName: compressModelProviderName,
  //     providerType: compressModelProviderName.toLowerCase(),
  //   },
  // }

  const allModels = useAllModels();
  const groupModels = groupBy(
    allModels.filter((v) => v.available),
    "provider.providerName",
  );
  const value = `${props.modelConfig.model}@${props.modelConfig?.providerName}`;
  // let compressModelValue = compressModel ?
  //   `${compressModelName}@${compressModelProviderName}` :
  //   `${props.modelConfig.compressModel}@${props.modelConfig?.compressProviderName}`;
  // console.log("compressModelValue", compressModelValue);
  return (
    <>
      <ListItem title={Locale.Settings.Model}>
        <Select
          aria-label={Locale.Settings.Model}
          value={value}
          align="left"
          onChange={(e) => {
            const [model, providerName] = e.currentTarget.value.split("@");
            props.updateConfig((config) => {
              config.model = ModalConfigValidator.model(model);
              config.providerName = providerName as ServiceProvider;
            });
          }}
        >
          {Object.keys(groupModels).map((providerName, index) => (
            <optgroup label={providerName} key={index}>
              {groupModels[providerName].map((v, i) => (
                <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                  {v.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </ListItem>
      <ListItem
        title={Locale.Settings.Temperature.Title}
        subTitle={Locale.Settings.Temperature.SubTitle}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            aria-label={Locale.Settings.Temperature.Title}
            type="number"
            min={0}
            max={1}
            value={props.modelConfig.temperature.toFixed(1)}
            disabled={!props.modelConfig.temperature_enabled}
            style={{
              width: "150px",
              backgroundColor: props.modelConfig.temperature_enabled
                ? "inherit"
                : "#e0e0e0",
            }}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.temperature = ModalConfigValidator.temperature(
                  e.currentTarget.valueAsNumber,
                );
              })
            }
          />
          <input
            type="checkbox"
            checked={props.modelConfig.temperature_enabled}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.temperature_enabled = e.currentTarget.checked;
              })
            }
          />
        </div>
      </ListItem>
      <ListItem
        title={Locale.Settings.TopP.Title}
        subTitle={Locale.Settings.TopP.SubTitle}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            aria-label={Locale.Settings.TopP.Title}
            type="number"
            min={0}
            max={1}
            value={(props.modelConfig.top_p ?? 1).toFixed(1)}
            disabled={!props.modelConfig.top_p_enabled}
            style={{
              width: "150px",
              backgroundColor: props.modelConfig.top_p_enabled
                ? "inherit"
                : "#e0e0e0",
            }}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.top_p = ModalConfigValidator.top_p(
                  e.currentTarget.valueAsNumber,
                );
              })
            }
          />
          <input
            type="checkbox"
            checked={props.modelConfig.top_p_enabled}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.top_p_enabled = e.currentTarget.checked;
              })
            }
          />
        </div>
      </ListItem>
      <ListItem
        title={Locale.Settings.MaxTokens.Title}
        subTitle={Locale.Settings.MaxTokens.SubTitle}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            aria-label={Locale.Settings.MaxTokens.Title}
            type="number"
            min={10}
            max={512000}
            value={props.modelConfig.max_tokens}
            disabled={!props.modelConfig.max_tokens_enabled}
            style={{
              width: "150px",
              backgroundColor: props.modelConfig.max_tokens_enabled
                ? "inherit"
                : "#e0e0e0",
            }}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.max_tokens = ModalConfigValidator.max_tokens(
                  e.currentTarget.valueAsNumber,
                );
              })
            }
          />
          <input
            type="checkbox"
            checked={props.modelConfig.max_tokens_enabled}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.max_tokens_enabled = e.currentTarget.checked;
              })
            }
          />
        </div>
      </ListItem>

      {props.modelConfig?.providerName == ServiceProvider.Google ? null : (
        <>
          <ListItem
            title={Locale.Settings.PresencePenalty.Title}
            subTitle={Locale.Settings.PresencePenalty.SubTitle}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                aria-label={Locale.Settings.PresencePenalty.Title}
                type="number"
                min={-2}
                max={2}
                value={props.modelConfig.presence_penalty?.toFixed(1)}
                disabled={!props.modelConfig.presence_penalty_enabled}
                style={{
                  width: "150px",
                  backgroundColor: props.modelConfig.presence_penalty_enabled
                    ? "inherit"
                    : "#e0e0e0",
                }}
                onChange={(e) =>
                  props.updateConfig((config) => {
                    config.presence_penalty =
                      ModalConfigValidator.presence_penalty(
                        e.currentTarget.valueAsNumber,
                      );
                  })
                }
              />
              <input
                type="checkbox"
                checked={props.modelConfig.presence_penalty_enabled}
                onChange={(e) =>
                  props.updateConfig((config) => {
                    config.presence_penalty_enabled = e.currentTarget.checked;
                  })
                }
              />
            </div>
          </ListItem>

          <ListItem
            title={Locale.Settings.FrequencyPenalty.Title}
            subTitle={Locale.Settings.FrequencyPenalty.SubTitle}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                aria-label={Locale.Settings.FrequencyPenalty.Title}
                type="number"
                min={-2}
                max={2}
                value={props.modelConfig.frequency_penalty?.toFixed(1)}
                disabled={!props.modelConfig.frequency_penalty_enabled}
                style={{
                  width: "150px",
                  backgroundColor: props.modelConfig.frequency_penalty_enabled
                    ? "inherit"
                    : "#e0e0e0",
                }}
                onChange={(e) =>
                  props.updateConfig((config) => {
                    config.frequency_penalty = ModalConfigValidator.top_p(
                      e.currentTarget.valueAsNumber,
                    );
                  })
                }
              />
              <input
                type="checkbox"
                checked={props.modelConfig.frequency_penalty_enabled}
                onChange={(e) =>
                  props.updateConfig((config) => {
                    config.frequency_penalty_enabled = e.currentTarget.checked;
                  })
                }
              />
            </div>
          </ListItem>

          <ListItem
            title={Locale.Settings.InjectSystemPrompts.Title}
            subTitle={Locale.Settings.InjectSystemPrompts.SubTitle}
          >
            <input
              aria-label={Locale.Settings.InjectSystemPrompts.Title}
              type="checkbox"
              checked={props.modelConfig.enableInjectSystemPrompts}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.enableInjectSystemPrompts =
                      e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.InputTemplate.Title}
            subTitle={Locale.Settings.InputTemplate.SubTitle}
          >
            <input
              aria-label={Locale.Settings.InputTemplate.Title}
              type="text"
              value={props.modelConfig.template}
              onChange={(e) =>
                props.updateConfig(
                  (config) => (config.template = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </>
      )}
      <ListItem
        title={Locale.Settings.HistoryCount.Title}
        subTitle={Locale.Settings.HistoryCount.SubTitle}
      >
        <InputRange
          aria={Locale.Settings.HistoryCount.Title}
          title={props.modelConfig.historyMessageCount.toString()}
          value={props.modelConfig.historyMessageCount}
          min="0"
          max="64"
          step="1"
          onChange={(e) =>
            props.updateConfig(
              (config) => (config.historyMessageCount = e.target.valueAsNumber),
            )
          }
        ></InputRange>
      </ListItem>

      <ListItem
        title={Locale.Settings.CompressThreshold.Title}
        subTitle={Locale.Settings.CompressThreshold.SubTitle}
      >
        <input
          aria-label={Locale.Settings.CompressThreshold.Title}
          type="number"
          min={500}
          max={4000}
          value={props.modelConfig.compressMessageLengthThreshold}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.compressMessageLengthThreshold =
                  e.currentTarget.valueAsNumber),
            )
          }
        ></input>
      </ListItem>
      <ListItem title={Locale.Memory.Title} subTitle={Locale.Memory.Send}>
        <input
          aria-label={Locale.Memory.Title}
          type="checkbox"
          checked={props.modelConfig.sendMemory}
          onChange={(e) =>
            props.updateConfig(
              (config) => (config.sendMemory = e.currentTarget.checked),
            )
          }
        ></input>
      </ListItem>
      {/* <ListItem
        title={Locale.Settings.CompressModel.Title}
        subTitle={Locale.Settings.CompressModel.SubTitle}
      >
        <Select
          className={styles["select-compress-model"]}
          aria-label={Locale.Settings.CompressModel.Title}
          value={compressModelValue}
          onChange={(e) => {
            console.log("e.currentTarget.value", e.currentTarget.value);
            const [model, providerName] =
              e.currentTarget.value.split(/@(?=[^@]*$)/);
            props.updateConfig((config) => {
              config.compressModel = ModalConfigValidator.model(model);
              config.compressProviderName = providerName as ServiceProvider;
            });
          }}
        >
          {allModels
            .filter((v) => v.available)
            .map((v, i) => (
              <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                {v.displayName}({v.provider?.providerName})
              </option>
            ))}
        </Select>
      </ListItem> */}
      {/* <ListItem
        title={Locale.Settings.TranslateModel.Title}
        subTitle={Locale.Settings.TranslateModel.SubTitle}
      >
        <Select
          className={styles["select-translate-model"]}
          aria-label={Locale.Settings.TranslateModel.Title}
          value={translateModelValue}
          onChange={(e) => {
            const [model, providerName] =
              e.currentTarget.value.split(/@(?=[^@]*$)/);
            props.updateConfig((config) => {
              config.translateModel = ModalConfigValidator.model(model);
              config.translateProviderName = providerName as ServiceProvider;
            });
          }}
        >
          {allModels
            .filter((v) => v.available)
            .map((v, i) => (
              <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                {v.displayName}({v.provider?.providerName})
              </option>
            ))}
        </Select>
      </ListItem>
      <ListItem
        title={Locale.Settings.OCRModel.Title}
        subTitle={Locale.Settings.OCRModel.SubTitle}
      >
        <Select
          className={styles["select-ocr-model"]}
          aria-label={Locale.Settings.OCRModel.Title}
          value={ocrModelValue}
          onChange={(e) => {
            const [model, providerName] =
              e.currentTarget.value.split(/@(?=[^@]*$)/);
            props.updateConfig((config) => {
              config.ocrModel = ModalConfigValidator.model(model);
              config.ocrProviderName = providerName as ServiceProvider;
            });
          }}
        >
          {allModels
            .filter((v) => v.available)
            .map((v, i) => (
              <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                {v.displayName}({v.provider?.providerName})
              </option>
            ))}
        </Select>
      </ListItem> */}
    </>
  );
}
