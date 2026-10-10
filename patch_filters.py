with open('src/components/features/processos/ProcessFilters/ProcessFilters.module.css', 'r') as f:
    content = f.read()

old_style = """.input,
.select {
  width: 100%;
  min-height: 42px;
  padding: 10px 14px;
  color: #172133;
  font-family: inherit;
  font-size: 14px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
}

.input:focus-visible,
.select:focus-visible {
  outline: 2px solid #c1a077;
  outline-offset: 1px;
}"""

new_style = """.input,
.select {
  width: 100%;
  min-height: 42px;
  padding: 10px 14px;
  color: #172133;
  font-family: inherit;
  font-size: 14px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.input:focus-visible,
.select:focus-visible {
  border-color: #c1a077;
  box-shadow: 0 0 0 2px rgba(193, 160, 119, 0.15);
}"""

content = content.replace(old_style, new_style)

with open('src/components/features/processos/ProcessFilters/ProcessFilters.module.css', 'w') as f:
    f.write(content)
