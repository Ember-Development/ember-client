"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
}

interface ApiParameter {
  id: string;
  name: string;
  in: "query" | "path" | "header";
  type: string;
  required: boolean;
  description: string;
}

interface ApiRequestBody {
  contentType: string;
  schema: string;
  example: string;
}

interface ApiResponse {
  id: string;
  statusCode: string;
  description: string;
  schema: string;
  example: string;
}

interface ApiEditorProps {
  content: string | null;
  onChange: (content: string) => void;
}

export function ApiEditor({ content, onChange }: ApiEditorProps) {
  const parseContent = (): ApiEndpoint[] => {
    if (!content) return [];
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  };

  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(parseContent());
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateEndpoints = (newEndpoints: ApiEndpoint[]) => {
    setEndpoints(newEndpoints);
    onChange(JSON.stringify(newEndpoints, null, 2));
  };

  const addEndpoint = () => {
    const newEndpoint: ApiEndpoint = {
      id: `endpoint-${Date.now()}`,
      method: "GET",
      path: "/api/example",
      summary: "Example Endpoint",
      description: "",
      parameters: [],
      responses: [
        {
          id: `response-${Date.now()}`,
          statusCode: "200",
          description: "Success",
          schema: "{}",
          example: "{}",
        },
      ],
    };
    updateEndpoints([...endpoints, newEndpoint]);
    setExpandedEndpoints(new Set([...expandedEndpoints, newEndpoint.id]));
  };

  const updateEndpoint = (id: string, updates: Partial<ApiEndpoint>) => {
    updateEndpoints(
      endpoints.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const deleteEndpoint = (id: string) => {
    updateEndpoints(endpoints.filter((e) => e.id !== id));
    const newExpanded = new Set(expandedEndpoints);
    newExpanded.delete(id);
    setExpandedEndpoints(newExpanded);
  };

  const addParameter = (endpointId: string) => {
    const newParam: ApiParameter = {
      id: `param-${Date.now()}`,
      name: "param",
      in: "query",
      type: "string",
      required: false,
      description: "",
    };
    updateEndpoints(
      endpoints.map((e) =>
        e.id === endpointId
          ? { ...e, parameters: [...e.parameters, newParam] }
          : e
      )
    );
  };

  const updateParameter = (
    endpointId: string,
    paramId: string,
    updates: Partial<ApiParameter>
  ) => {
    updateEndpoints(
      endpoints.map((e) =>
        e.id === endpointId
          ? {
              ...e,
              parameters: e.parameters.map((p) =>
                p.id === paramId ? { ...p, ...updates } : p
              ),
            }
          : e
      )
    );
  };

  const deleteParameter = (endpointId: string, paramId: string) => {
    updateEndpoints(
      endpoints.map((e) =>
        e.id === endpointId
          ? { ...e, parameters: e.parameters.filter((p) => p.id !== paramId) }
          : e
      )
    );
  };

  const addResponse = (endpointId: string) => {
    const newResponse: ApiResponse = {
      id: `response-${Date.now()}`,
      statusCode: "200",
      description: "Success",
      schema: "{}",
      example: "{}",
    };
    updateEndpoints(
      endpoints.map((e) =>
        e.id === endpointId
          ? { ...e, responses: [...e.responses, newResponse] }
          : e
      )
    );
  };

  const updateResponse = (
    endpointId: string,
    responseId: string,
    updates: Partial<ApiResponse>
  ) => {
    updateEndpoints(
      endpoints.map((e) =>
        e.id === endpointId
          ? {
              ...e,
              responses: e.responses.map((r) =>
                r.id === responseId ? { ...r, ...updates } : r
              ),
            }
          : e
      )
    );
  };

  const deleteResponse = (endpointId: string, responseId: string) => {
    updateEndpoints(
      endpoints.map((e) =>
        e.id === endpointId
          ? { ...e, responses: e.responses.filter((r) => r.id !== responseId) }
          : e
      )
    );
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEndpoints(newExpanded);
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "POST":
        return "bg-green-100 text-green-700 border-green-200";
      case "PUT":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "PATCH":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "DELETE":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (typeof window !== "undefined" && window.document.documentElement.requestFullscreen) {
        window.document.documentElement.requestFullscreen();
      }
    } else {
      setIsFullscreen(false);
      if (typeof window !== "undefined" && window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
    }
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "h-full"} bg-slate-50`}>
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">API Documentation</h2>
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded"
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {endpoints.map((endpoint) => (
          <div
            key={endpoint.id}
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleExpand(endpoint.id)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {expandedEndpoints.has(endpoint.id) ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                <select
                  value={endpoint.method}
                  onChange={(e) =>
                    updateEndpoint(endpoint.id, { method: e.target.value })
                  }
                  className={`px-2 py-1 text-xs font-semibold rounded border ${getMethodColor(
                    endpoint.method
                  )}`}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={endpoint.path}
                  onChange={(e) =>
                    updateEndpoint(endpoint.id, { path: e.target.value })
                  }
                  className="flex-1 px-2 py-1 text-sm font-mono border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/api/endpoint"
                />
                <input
                  type="text"
                  value={endpoint.summary}
                  onChange={(e) =>
                    updateEndpoint(endpoint.id, { summary: e.target.value })
                  }
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endpoint summary"
                />
                <button
                  onClick={() => deleteEndpoint(endpoint.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedEndpoints.has(endpoint.id) && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={endpoint.description}
                    onChange={(e) =>
                      updateEndpoint(endpoint.id, { description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Parameters
                    </label>
                    <button
                      onClick={() => addParameter(endpoint.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add Parameter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {endpoint.parameters.map((param) => (
                      <div
                        key={param.id}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200"
                      >
                        <select
                          value={param.in}
                          onChange={(e) =>
                            updateParameter(endpoint.id, param.id, {
                              in: e.target.value as any,
                            })
                          }
                          className="px-2 py-1 text-xs border border-slate-200 rounded"
                        >
                          <option value="query">Query</option>
                          <option value="path">Path</option>
                          <option value="header">Header</option>
                        </select>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) =>
                            updateParameter(endpoint.id, param.id, {
                              name: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded"
                          placeholder="Parameter name"
                        />
                        <select
                          value={param.type}
                          onChange={(e) =>
                            updateParameter(endpoint.id, param.id, {
                              type: e.target.value,
                            })
                          }
                          className="px-2 py-1 text-xs border border-slate-200 rounded"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="array">array</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={param.required}
                            onChange={(e) =>
                              updateParameter(endpoint.id, param.id, {
                                required: e.target.checked,
                              })
                            }
                          />
                          Required
                        </label>
                        <input
                          type="text"
                          value={param.description}
                          onChange={(e) =>
                            updateParameter(endpoint.id, param.id, {
                              description: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded"
                          placeholder="Description"
                        />
                        <button
                          onClick={() => deleteParameter(endpoint.id, param.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Responses
                    </label>
                    <button
                      onClick={() => addResponse(endpoint.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add Response
                    </button>
                  </div>
                  <div className="space-y-2">
                    {endpoint.responses.map((response) => (
                      <div
                        key={response.id}
                        className="p-2 bg-slate-50 rounded border border-slate-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={response.statusCode}
                            onChange={(e) =>
                              updateResponse(endpoint.id, response.id, {
                                statusCode: e.target.value,
                              })
                            }
                            className="w-20 px-2 py-1 text-xs border border-slate-200 rounded"
                            placeholder="200"
                          />
                          <input
                            type="text"
                            value={response.description}
                            onChange={(e) =>
                              updateResponse(endpoint.id, response.id, {
                                description: e.target.value,
                              })
                            }
                            className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded"
                            placeholder="Response description"
                          />
                          <button
                            onClick={() => deleteResponse(endpoint.id, response.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">
                              Schema
                            </label>
                            <textarea
                              value={response.schema}
                              onChange={(e) =>
                                updateResponse(endpoint.id, response.id, {
                                  schema: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded"
                              rows={3}
                              placeholder="{}"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">
                              Example
                            </label>
                            <textarea
                              value={response.example}
                              onChange={(e) =>
                                updateResponse(endpoint.id, response.id, {
                                  example: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded"
                              rows={3}
                              placeholder="{}"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {endpoints.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-500 mb-4">No API endpoints defined</p>
            <button
              onClick={addEndpoint}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Add Endpoint
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
        <button
          onClick={addEndpoint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Add Endpoint
        </button>
      </div>
    </div>
  );
}

