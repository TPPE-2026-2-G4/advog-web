export default function SerieScope({ value, onChange, disabled = false }) {
  return (
    <fieldset disabled={disabled}>
      <legend>Aplicar a:</legend>
      <label>
        <input
          type="radio"
          name="alcance-serie"
          checked={value === 'individual'}
          onChange={() => onChange('individual')}
        />{' '}
        Somente este lançamento
      </label>
      <br />
      <label>
        <input
          type="radio"
          name="alcance-serie"
          checked={value === 'serie'}
          onChange={() => onChange('serie')}
        />{' '}
        Este e os próximos da série
      </label>
      <p>Lançamentos realizados serão preservados nas alterações em grupo.</p>
    </fieldset>
  );
}
