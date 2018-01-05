import uri from "urijs";
import * as globals from "../globals";

/*
  https://medium.com/@jacobp100/you-arent-using-redux-middleware-enough-94ffe991e6
  storeInstance => functionToCallWithAnActionThatWillSendItToTheNextMiddleware => actionThatDispatchWasCalledWith => valueToUseAsTheReturnValueOfTheDispatchCall
*/

/*
  What this file does:

  1. fire a filter action anywhere in the app
  2. ** this middleware checks to see the state of all the currently selected filters, including the new one
  3. ** create updated selection from a copy of all the cells presently on the client (this may be a subset of 'all')
  4. ** append that new selection to the action so that it magically appears in the reducer just because the action was fired

  This is nice because we keep a lot of filtering business logic centralized (what it means in practice to be selected)
*/


const updateCellSelectionMiddleware = (store) => {
  return (next) => {
    return (action) => {
      const s = store.getState();

      /* this is a hardcoded map of the things we need to keep an eye on and update global cell selection in response to */
      const filterJustChanged =
        action.type === "continuous selection using parallel coords brushing" ||
        action.type === "graph brush selection change" ||
        action.type === "graph brush deselect" ||
        action.type === "categorical metadata filter deselect" ||
        action.type === "categorical metadata filter select" ||
        action.type === "categorical metadata filter only this"
        ;

      if (
        !filterJustChanged ||
        !s.controls.allCellsOnClient
        /* graphMap is set at the same time as allCells, so we assume it exists */
      ) {
        return next(action); /* if the cells haven't loaded or the action wasn't a filter, bail */
      }


      /*
        - make a FRESH copy of all of the cells
        - metadata has cellname, and that's all we ever need (is a key to graphMap)
      */
      let newSelection = s.controls.currentCellSelection.slice(0);
      _.each(newSelection, (cell) => { cell["__selected__"] = true } );
      /*
         in plain language...

         (a) once the cells have loaded.
         (b) each time a user changes ANY control we need to update currentCellSelection
         there are two states:

         1. control state we already know about (state.foo)
         2. control states that override states we already know about (action.foo applied instead of state.foo)

      */

      if ( /* is there a 2d graph brush selection ? */
        action.type === "graph brush selection change" ||
        s.controls.graphBrushSelection
      ) {

        const graphBrushSelection = /* it exists, so is it new or old */
          action.type === "graph brush selection change" ? action.brushCoords :
          s.controls.graphBrushSelection

        _.each(newSelection, (cell, i) => {

          if (!s.controls.graphMap[cell["CellName"]]) {
            newSelection[i]["__selected__"] = false; /* make a toggle in future */
            return
          }

          const coords = s.controls.graphMap[cell["CellName"]]; // [0.08005009151334168, 0.6907652173913044]

          const pointIsInsideBrushBounds = (
            globals.graphXScale(coords[0]) >= graphBrushSelection.northwestX &&
            globals.graphXScale(coords[0]) <= graphBrushSelection.southeastX &&
            globals.graphYScale(coords[1]) >= graphBrushSelection.northwestY &&
            globals.graphYScale(coords[1]) <= graphBrushSelection.southeastY
          );

          if (!pointIsInsideBrushBounds) {
            newSelection[i]["__selected__"] = false;
          }

        })
      }
      if (
        action.type === "continuous selection using parallel coords brushing" && s.controls.continuousSelection ||
        s.controls.continuousSelection
      ) {

        _.each(newSelection, (cell, i) => {

            const cellExtentsAreWithinContinuousSelectionBounds = s.controls.continuousSelection.every((active) => {
              // test if point is within extents for each active brush
              return active.dimension.type.within(
                cell[active.dimension.key],
                active.extent,
                active.dimension
              );
            })

            if (!cellExtentsAreWithinContinuousSelectionBounds) {
              newSelection[i]["__selected__"] = false;
            }
        })
      }

      /*
        1. figure out if the users have unchecked boxes
        2. put them in an array
        3. filter on them
      */

      let newCategoricalAsBooleansMap = s.controls.categoricalAsBooleansMap;

      /*
        ...spread for merge: https://github.com/reactjs/redux/issues/432

        we do the update here instead of the reducer because we need it for the reactive computation
      */
      if (action.type === "categorical metadata filter select") {
        newCategoricalAsBooleansMap = {
          ...s.controls.categoricalAsBooleansMap,
          [action.metadataField]: {
            ...s.controls.categoricalAsBooleansMap[action.metadataField],
            [action.value]: true
          }
        }
      } else if (action.type === "categorical metadata filter deselect") {
        newCategoricalAsBooleansMap = {
          ...s.controls.categoricalAsBooleansMap,
          [action.metadataField]: {
            ...s.controls.categoricalAsBooleansMap[action.metadataField],
            [action.value]: false
          }
        }
      } else if (action.type === "categorical metadata filter only this") {

        const metadataFieldWithOnlyThisValueSelected = {};

        /* set EVERYTHING to false in this intermediate object */
        _.each(s.controls.categoricalAsBooleansMap[action.metadataField], (isActive, option) => {
          metadataFieldWithOnlyThisValueSelected[option] = false;
        })

        /* then set the one we want to true, to avoid the conditional nesting */
        metadataFieldWithOnlyThisValueSelected[action.value] = true;

        newCategoricalAsBooleansMap = {
          ...s.controls.categoricalAsBooleansMap,
          [action.metadataField]: metadataFieldWithOnlyThisValueSelected
        }
        console.log('within', metadataFieldWithOnlyThisValueSelected)

      }

      const inactiveCategories = [];
      _.each(newCategoricalAsBooleansMap, (options, category) => {
        _.each(options, (isActive, option) => {
          if (!isActive) {
            inactiveCategories.push({category, option})
          }
        })
      })

      if (inactiveCategories.length > 0) {
        _.each(inactiveCategories, (d) => {
          _.each(newSelection, (cell, i) => {
            if (""+cell[d.category] === ""+d.option) { /* nums and strings to strings */
              newSelection[i]["__selected__"] = false;
            }
          })
        })
      }

      let modifiedAction = Object.assign({}, action, {
        newSelection,
        newCategoricalAsBooleansMap,
      }) /* append the result of all the filters to the action the user just triggered */

      return next(modifiedAction);
    }
  }
};

export default updateCellSelectionMiddleware;