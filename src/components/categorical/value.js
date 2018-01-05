import { connect } from "react-redux";
import React from "react";
import * as globals from "../../globals";
import actions from "../../actions";

@connect((state) => {
  return {
    categoricalAsBooleansMap: state.controls.categoricalAsBooleansMap
  }
})
class CategoryValue extends React.Component {

  toggleOff() {
    this.props.dispatch({
      type: "categorical metadata filter deselect",
      metadataField: this.props.metadataField,
      value: this.props.value
    });
  }

  toggleOn() {
    this.props.dispatch({
      type: "categorical metadata filter select",
      metadataField: this.props.metadataField,
      value: this.props.value
    });
  }

  toggleOnlyThis() {
    this.props.dispatch({
      type: "categorical metadata filter only this",
      metadataField: this.props.metadataField,
      value: this.props.value
    })
  }

  render () {
    if (!this.props.categoricalAsBooleansMap) return null

    const selected = this.props.categoricalAsBooleansMap[this.props.metadataField][this.props.value]

    return (
      <div
        key={this.props.i}
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontWeight: selected ? 700 : 400,
        }}>
        <p style={{
            width: 200,
            flexShrink: 0,
            margin: 0,
            lineHeight: "1em"
          }}>
          <input
            onChange={selected ? this.toggleOff.bind(this) : this.toggleOn.bind(this)}
            checked={selected}
            type="checkbox"/>
            {this.props.value}
        </p>
        <p style={{
            margin: 0,
            lineHeight: "1em"
          }}>
          {this.props.count}
        </p>
        <span
          onClick={this.toggleOnlyThis.bind(this)}
          style={{
            fontFamily: globals.accentFont,
            fontSize: 10,
            fontWeight: 100,
            fontStyle: "italic",
            cursor: "pointer",
          }}>
        {"only"}
        </span>
      </div>
    )
  }
}

export default CategoryValue;

// onClick={selected ? this.toggleOff.bind(this) : this.toggleOn.bind(this)}
// toggleOn() {
//   this.props.dispatch(
//     actions.attemptCategoricalMetadataSelection(
//       this.props.metadataField,
//       this.props.value
//     ))
// }
// toggleOff() {
//   this.props.dispatch(
//     actions.attemptCategoricalMetadataDeselection(
//       this.props.metadataField,
//       this.props.value
//     ))
// }
