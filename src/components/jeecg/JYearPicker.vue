<template>
  <a-date-picker
    dropdownClassName="j-date-picker"
    mode="year"
    format="YYYY"
    :placeholder="placeholder"
    @change="handleDateChange"
    v-model="yearVal"
    :open="dateopen"
    @openChange="openChangeYear"
    @panelChange="panelChangeYear"
    :disabled="disabled"
    :getCalendarContainer="getCalendarContainer"
    v-bind="$attrs"/>
</template>

<script>
  import moment from 'moment'

  export default {
    name: "JYearPicker",
    components:{
      moment
    },
    props: {
      placeholder: {
        type: String,
        default: '',
        required: false
      },
      value: {
        type: String,
        required: false
      },
      disabled: {
        type: Boolean,
        required: false,
        default: false
      },
      getCalendarContainer: {
        type: Function,
        default: (node) => node.parentNode
      }
    },
    data() {
      let dateStr = this.value;
      return {
        yearVal: !dateStr?null:moment(dateStr).format('YYYY'),
        dateopen: false
      }
    },
    watch: {
      value (val) {
        if(!val){
          this.yearVal = null;
        }else{
          this.yearVal = moment(val).format('YYYY');
        }
      }
    },
    methods: {
      moment,
      handleDateChange(mom, dateStr) {
        this.$emit('change', dateStr);
        this.yearVal=null;
      },
      openChangeYear(status) {
        if (status) {
          this.dateopen = true;
        } else {
          this.dateopen = false;
        }
      },
      // 选择年之后 关闭弹框
      panelChangeYear(value) {
        this.yearVal = value;
        this.dateopen = false;
        this.$emit('input', moment(value).format("YYYY"));
      }
    }
  }
</script>

<style scoped>

</style>